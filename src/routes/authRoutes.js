const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Driver, Station } = require('../models');
const config = require('../config');
const { isAuthenticated } = require('../middleware/auth');
const authController = require('../controllers/authController');

// 用户注册
router.post('/register', authController.register);

// 用户登录
router.post('/login', authController.login);

// 退出登录路由
router.post('/logout', isAuthenticated, authController.logout);

// 获取用户信息
router.get('/user-info', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 根据角色获取额外信息
    let additionalInfo = {};

    if (user.role === 'driver') {
      const driverInfo = await Driver.findOne({
        where: { user_id: user.id }
      });
      additionalInfo.driver = driverInfo;
    } else if (user.role === 'station_manager') {
      const stationInfo = await Station.findOne({
        where: { manager_id: user.id }
      });
      additionalInfo.station = stationInfo;
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      ...additionalInfo
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败: ' + error.message });
  }
});

// 验证 token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未提供 token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    // 根据角色获取额外信息
    let additionalInfo = {};

    if (user.role === 'driver') {
      const driverInfo = await Driver.findOne({
        where: { user_id: user.id }
      });
      additionalInfo.driver = driverInfo;
    } else if (user.role === 'station_manager') {
      const stationInfo = await Station.findOne({
        where: { manager_id: user.id }
      });
      additionalInfo.station = stationInfo;
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        ...additionalInfo
      }
    });
  } catch (error) {
    console.error('验证 token 失败:', error);
    res.status(401).json({ error: '无效的 token' });
  }
});

module.exports = router; 