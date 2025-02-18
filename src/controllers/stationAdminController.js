const { Station, Package, Driver, StorageCell } = require('../models');

// 获取统计数据
exports.getStatistics = async (req, res) => {
  try {
    const station = await Station.findOne({
      where: { adminId: req.user.id }
    });

    if (!station) {
      return res.status(404).json({ message: '站点不存在' });
    }

    const statistics = await station.getStatistics();
    res.json(statistics);
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ message: '获取统计数据失败' });
  }
};

// 获取包裹列表
exports.getPackages = async (req, res) => {
  try {
    const station = await Station.findOne({
      where: { adminId: req.user.id }
    });

    if (!station) {
      return res.status(404).json({ message: '站点不存在' });
    }

    const packages = await Package.findAll({
      where: { stationId: station.id }
    });
    res.json(packages);
  } catch (error) {
    console.error('获取包裹列表失败:', error);
    res.status(500).json({ message: '获取包裹列表失败' });
  }
};

// 获取站点信息
exports.getStationInfo = async (req, res) => {
  try {
    const station = await Station.findOne({
      where: { adminId: req.user.id }
    });

    if (!station) {
      return res.status(404).json({ message: '站点不存在' });
    }

    res.json(station);
  } catch (error) {
    console.error('获取站点信息失败:', error);
    res.status(500).json({ message: '获取站点信息失败' });
  }
};

// 更新包裹状态
exports.updatePackageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const station = await Station.findOne({
      where: { adminId: req.user.id }
    });

    if (!station) {
      return res.status(404).json({ message: '站点不存在' });
    }

    const package = await Package.findOne({
      where: { 
        id,
        stationId: station.id
      }
    });

    if (!package) {
      return res.status(404).json({ message: '包裹不存在' });
    }

    await package.update({ status });
    res.json(package);
  } catch (error) {
    console.error('更新包裹状态失败:', error);
    res.status(500).json({ message: '更新包裹状态失败' });
  }
};

// 获取存储统计
exports.getStorageStats = async (req, res) => {
  try {
    const station = await Station.findOne({
      where: { adminId: req.user.id }
    });

    if (!station) {
      return res.status(404).json({ message: '站点不存在' });
    }

    const stats = await station.getStorageStats();
    res.json(stats);
  } catch (error) {
    console.error('获取存储统计失败:', error);
    res.status(500).json({ message: '获取存储统计失败' });
  }
};

// 获取存储格子信息
exports.getStorageCells = async (req, res) => {
  try {
    const station = await Station.findOne({
      where: { adminId: req.user.id }
    });

    if (!station) {
      return res.status(404).json({ message: '站点不存在' });
    }

    const cells = await StorageCell.findAll({
      where: { stationId: station.id }
    });
    res.json(cells);
  } catch (error) {
    console.error('获取存储格子信息失败:', error);
    res.status(500).json({ message: '获取存储格子信息失败' });
  }
};

// 获取可用司机列表
exports.getAvailableDrivers = async (req, res) => {
  try {
    const station = await Station.findOne({
      where: { adminId: req.user.id }
    });

    if (!station) {
      return res.status(404).json({ message: '站点不存在' });
    }

    const drivers = await Driver.findAll({
      where: {
        status: 'available',
        currentStationId: station.id
      }
    });
    res.json(drivers);
  } catch (error) {
    console.error('获取可用司机列表失败:', error);
    res.status(500).json({ message: '获取可用司机列表失败' });
  }
}; 