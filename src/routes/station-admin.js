const express = require('express');
const router = express.Router();
const { isAuthenticated, isStationAdmin } = require('../middleware/auth');
const stationAdminController = require('../controllers/stationAdminController');

// 获取统计数据
router.get('/statistics', isAuthenticated, isStationAdmin, stationAdminController.getStatistics);

// 获取包裹列表
router.get('/packages', isAuthenticated, isStationAdmin, stationAdminController.getPackages);

// 获取站点信息
router.get('/station', isAuthenticated, isStationAdmin, stationAdminController.getStationInfo);

// 更新包裹状态
router.put('/packages/:id/status', isAuthenticated, isStationAdmin, stationAdminController.updatePackageStatus);

// 获取存储统计
router.get('/storage/stats', isAuthenticated, isStationAdmin, stationAdminController.getStorageStats);

// 获取存储格子信息
router.get('/storage/cells', isAuthenticated, isStationAdmin, stationAdminController.getStorageCells);

// 获取可用司机列表
router.get('/available-drivers', isAuthenticated, isStationAdmin, stationAdminController.getAvailableDrivers);

module.exports = router; 