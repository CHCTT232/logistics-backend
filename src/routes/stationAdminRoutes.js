const express = require('express');
const router = express.Router();
const { isStationAdmin } = require('../middleware/auth');
const { Package, User, SystemSetting } = require('../models');
const { Op } = require('sequelize');

// 生成运单号
function generateTrackingNumber() {
  const prefix = 'PKG';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// 获取管理员所属站点信息
router.get('/station', isStationAdmin, async (req, res) => {
  try {
    res.json(req.station);
  } catch (error) {
    console.error('获取站点信息失败:', error);
    res.status(500).json({ error: '获取站点信息失败' });
  }
});

// 添加新包裹
router.post('/packages', isStationAdmin, async (req, res) => {
  const {
    senderId,
    receiverName,
    receiverPhone,
    receiverAddress,
    toStationId,
    weight,
    length,
    width,
    height
  } = req.body;

  try {
    const originStationId = req.station.id;
    const volume = length * width * height;

    // 获取系统设置
    const settings = await SystemSetting.findAll();
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    // 计算运费
    const basePrice = parseFloat(settingsMap.basePrice);
    const baseDistance = parseFloat(settingsMap.baseDistance);
    const volumeRatio = parseFloat(settingsMap.volumeRatio);

    // TODO: 使用高德地图API计算实际距离
    const distance = baseDistance; // 暂时使用基础距离
    const price = (basePrice * (distance / baseDistance)) * 
                 (Math.max(weight, volume / volumeRatio) / (baseDistance / volumeRatio));

    // 创建包裹记录
    const package = await Package.create({
      sender_id: senderId,
      receiver_name: receiverName,
      receiver_phone: receiverPhone,
      receiver_address: receiverAddress,
      origin_station_id: originStationId,
      destination_station_id: toStationId,
      weight,
      volume,
      price,
      dimensions: { length, width, height },
      tracking_number: generateTrackingNumber(),
      status: 'pending'
    });

    res.status(201).json({
      message: '包裹添加成功',
      packageId: package.id,
      price
    });
  } catch (error) {
    console.error('添加包裹失败:', error);
    res.status(500).json({ error: '添加包裹失败: ' + error.message });
  }
});

// 获取站点所有包裹
router.get('/packages', isStationAdmin, async (req, res) => {
  try {
    const stationId = req.station.id;

    const packages = await Package.findAll({
      where: {
        [Op.or]: [
          { origin_station_id: stationId },
          { destination_station_id: stationId }
        ]
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['username']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(packages);
  } catch (error) {
    console.error('获取包裹列表失败:', error);
    res.status(500).json({ error: '获取包裹列表失败' });
  }
});

// 更新包裹状态
router.put('/packages/:id/status', isStationAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const stationId = req.station.id;

    // 验证包裹是否属于该站点
    const package = await Package.findOne({
      where: {
        id,
        [Op.or]: [
          { origin_station_id: stationId },
          { destination_station_id: stationId }
        ]
      }
    });

    if (!package) {
      return res.status(404).json({ error: '包裹不存在或不属于该站点' });
    }

    // 更新包裹状态
    await package.update({ status });

    res.json({ message: '包裹状态更新成功' });
  } catch (error) {
    console.error('更新包裹状态失败:', error);
    res.status(500).json({ error: '更新包裹状态失败' });
  }
});

// 获取站点统计数据
router.get('/statistics', isStationAdmin, async (req, res) => {
  try {
    console.log('开始获取站点统计数据，站点ID:', req.station?.id);
    const stationId = req.station?.id;
    
    if (!stationId) {
      console.error('未找到站点ID');
      return res.status(404).json({ error: '未找到站点信息' });
    }

    const today = new Date().toISOString().split('T')[0];
    console.log('统计日期:', today);

    // 获取待处理包裹数量
    const pendingPackages = await Package.count({
      where: {
        [Op.or]: [
          { origin_station_id: stationId },
          { destination_station_id: stationId }
        ],
        status: 'pending'
      }
    });
    console.log('待处理包裹数量:', pendingPackages);

    // 获取今日入库包裹数量
    const todayInbound = await Package.count({
      where: {
        destination_station_id: stationId,
        status: 'received',
        created_at: {
          [Op.gte]: today
        }
      }
    });
    console.log('今日入库包裹数量:', todayInbound);

    // 获取今日出库包裹数量
    const todayOutbound = await Package.count({
      where: {
        origin_station_id: stationId,
        status: 'shipped',
        created_at: {
          [Op.gte]: today
        }
      }
    });
    console.log('今日出库包裹数量:', todayOutbound);

    // 获取仓储使用情况
    const usedStorage = await Package.sum('volume', {
      where: {
        [Op.or]: [
          { origin_station_id: stationId },
          { destination_station_id: stationId }
        ],
        status: 'pending'
      }
    }) || 0;
    console.log('已使用仓储空间:', usedStorage);

    const station = await req.station.reload();
    console.log('站点信息:', {
      id: station.id,
      storage_capacity: station.storage_capacity
    });

    const storageUsage = station.storage_capacity > 0
      ? Math.round((usedStorage / station.storage_capacity) * 100)
      : 0;
    console.log('仓储使用率:', storageUsage + '%');

    res.json({
      pendingPackages,
      todayInbound,
      todayOutbound,
      storageUsage,
      usedStorage,
      totalStorage: station.storage_capacity
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败: ' + error.message });
  }
});

module.exports = router; 