const express = require('express');
const router = express.Router();
const db = require('../config/database');

// 中间件：检查是否是普通用户
const isCustomer = (req, res, next) => {
  if (req.user && req.user.userType === 'user') {
    next();
  } else {
    res.status(403).json({ error: '需要用户权限' });
  }
};

// 获取用户的所有包裹
router.get('/packages', isCustomer, async (req, res) => {
  try {
    db.all(
      `SELECT p.*,
              s1.name as from_station_name,
              s1.address as from_address,
              s2.name as to_station_name,
              s2.address as to_address,
              u.username as driver_name
       FROM packages p
       JOIN stations s1 ON p.from_station_id = s1.id
       JOIN stations s2 ON p.to_station_id = s2.id
       LEFT JOIN users u ON p.driver_id = u.id
       WHERE p.sender_id = ? OR p.receiver_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.userId, req.user.userId],
      (err, packages) => {
        if (err) {
          console.error('获取包裹列表失败:', err);
          return res.status(500).json({ error: '获取包裹列表失败' });
        }

        res.json(packages);
      }
    );
  } catch (error) {
    console.error('获取包裹列表失败:', error);
    res.status(500).json({ error: '获取包裹列表失败' });
  }
});

// 获取包裹详情
router.get('/packages/:id', isCustomer, async (req, res) => {
  const { id } = req.params;

  try {
    db.get(
      `SELECT p.*,
              s1.name as from_station_name,
              s1.address as from_address,
              s1.longitude as from_longitude,
              s1.latitude as from_latitude,
              s2.name as to_station_name,
              s2.address as to_address,
              s2.longitude as to_longitude,
              s2.latitude as to_latitude,
              u.username as driver_name,
              u.phone as driver_phone
       FROM packages p
       JOIN stations s1 ON p.from_station_id = s1.id
       JOIN stations s2 ON p.to_station_id = s2.id
       LEFT JOIN users u ON p.driver_id = u.id
       WHERE p.id = ? AND (p.sender_id = ? OR p.receiver_id = ?)`,
      [id, req.user.userId, req.user.userId],
      (err, package) => {
        if (err) {
          console.error('获取包裹详情失败:', err);
          return res.status(500).json({ error: '获取包裹详情失败' });
        }

        if (!package) {
          return res.status(404).json({ error: '包裹不存在或无权访问' });
        }

        res.json(package);
      }
    );
  } catch (error) {
    console.error('获取包裹详情失败:', error);
    res.status(500).json({ error: '获取包裹详情失败' });
  }
});

// 获取所有站点
router.get('/stations', isCustomer, async (req, res) => {
  try {
    db.all(
      'SELECT id, name, address, longitude, latitude FROM stations WHERE status = ?',
      ['active'],
      (err, stations) => {
        if (err) {
          console.error('获取站点列表失败:', err);
          return res.status(500).json({ error: '获取站点列表失败' });
        }

        res.json(stations);
      }
    );
  } catch (error) {
    console.error('获取站点列表失败:', error);
    res.status(500).json({ error: '获取站点列表失败' });
  }
});

// 预估运费
router.post('/estimate-price', isCustomer, async (req, res) => {
  const { fromStationId, toStationId, weight, length, width, height } = req.body;

  try {
    // 获取系统设置
    db.all('SELECT * FROM system_settings', async (err, settings) => {
      if (err) {
        console.error('获取系统设置失败:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      // 获取站点信息
      db.get(
        'SELECT longitude, latitude FROM stations WHERE id = ?',
        [fromStationId],
        (err, fromStation) => {
          if (err) {
            console.error('获取起始站点失败:', err);
            return res.status(500).json({ error: '服务器错误' });
          }

          if (!fromStation) {
            return res.status(404).json({ error: '起始站点不存在' });
          }

          db.get(
            'SELECT longitude, latitude FROM stations WHERE id = ?',
            [toStationId],
            (err, toStation) => {
              if (err) {
                console.error('获取目标站点失败:', err);
                return res.status(500).json({ error: '服务器错误' });
              }

              if (!toStation) {
                return res.status(404).json({ error: '目标站点不存在' });
              }

              // TODO: 使用高德地图API计算实际距离
              const baseDistance = parseFloat(settingsMap.baseDistance);
              const basePrice = parseFloat(settingsMap.basePrice);
              const volumeRatio = parseFloat(settingsMap.volumeRatio);

              const volume = length * width * height;
              const price = (basePrice * (baseDistance / baseDistance)) *
                          (Math.max(weight, volume / volumeRatio) / (baseDistance / volumeRatio));

              res.json({
                estimatedPrice: price,
                distance: baseDistance // 暂时使用基础距离
              });
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('预估运费失败:', error);
    res.status(500).json({ error: '预估运费失败' });
  }
});

// 创建包裹订单
router.post('/create-order', isCustomer, async (req, res) => {
  const {
    fromStationId,
    toStationId,
    receiverId,
    weight,
    length,
    width,
    height
  } = req.body;

  try {
    // 验证收件人是否存在
    db.get('SELECT id FROM users WHERE id = ?', [receiverId], (err, receiver) => {
      if (err) {
        console.error('验证收件人失败:', err);
        return res.status(500).json({ error: '服务器错误' });
      }

      if (!receiver) {
        return res.status(404).json({ error: '收件人不存在' });
      }

      // 获取系统设置
      db.all('SELECT * FROM system_settings', (err, settings) => {
        if (err) {
          console.error('获取系统设置失败:', err);
          return res.status(500).json({ error: '服务器错误' });
        }

        const settingsMap = settings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {});

        const volume = length * width * height;
        const baseDistance = parseFloat(settingsMap.baseDistance);
        const basePrice = parseFloat(settingsMap.basePrice);
        const volumeRatio = parseFloat(settingsMap.volumeRatio);

        // TODO: 使用高德地图API计算实际距离
        const price = (basePrice * (baseDistance / baseDistance)) *
                     (Math.max(weight, volume / volumeRatio) / (baseDistance / volumeRatio));

        // 创建包裹记录
        db.run(
          `INSERT INTO packages (
            sender_id, receiver_id, from_station_id, to_station_id,
            status, weight, volume, price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.userId,
            receiverId,
            fromStationId,
            toStationId,
            'pending',
            weight,
            volume,
            price
          ],
          function(err) {
            if (err) {
              console.error('创建包裹记录失败:', err);
              return res.status(500).json({ error: '创建包裹记录失败' });
            }

            res.status(201).json({
              message: '订单创建成功',
              orderId: this.lastID,
              price
            });
          }
        );
      });
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
});

module.exports = router; 