const express = require('express');
const router = express.Router();

// 导入各个路由模块
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const userRoutes = require('./user');
const driverRoutes = require('./driver');
const stationRoutes = require('./station');
const packageRoutes = require('./package');
const trunkRoutes = require('./trunk');
const stationAdminRoutes = require('./station-admin');

// 注册路由
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use('/driver', driverRoutes);
router.use('/station', stationRoutes);
router.use('/packages', packageRoutes);
router.use('/trunk', trunkRoutes);
router.use('/station-admin', stationAdminRoutes);

module.exports = router; 