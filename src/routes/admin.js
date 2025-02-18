const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const stationController = require('../controllers/stationController');
const auth = require('../middleware/auth');

// 管理员相关路由
router.get('/admins', auth.isAdmin, adminController.getAdminList);
router.post('/admins', auth.isAdmin, adminController.createAdmin);
router.put('/admins/:id/status', auth.isAdmin, adminController.updateAdminStatus);

// 统计相关路由
router.get('/statistics', auth.isAdmin, adminController.getStatistics);
router.get('/order-trend', auth.isAdmin, adminController.getOrderTrend);
router.get('/income-trend', auth.isAdmin, adminController.getIncomeTrend);

// 站点相关路由
router.get('/stations', auth.isAdmin, stationController.getStationList);
router.get('/stations/:id', auth.isAdmin, stationController.getStationDetail);
router.post('/stations', auth.isAdmin, stationController.createStation);
router.put('/stations/:id', auth.isAdmin, stationController.updateStation);
router.delete('/stations/:id', auth.isAdmin, stationController.deleteStation);
router.put('/stations/:id/status', auth.isAdmin, stationController.updateStationStatus);
router.put('/stations/:id/admin', auth.isAdmin, stationController.updateStationAdmin);

module.exports = router; 