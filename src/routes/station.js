const express = require('express');
const router = express.Router();
const { isAuthenticated, isStationAdmin } = require('../middleware/auth');
const { Station, User } = require('../models');

// 获取所有站点列表
router.get('/list', isAuthenticated, async (req, res) => {
  try {
    const stations = await Station.findAll({
      where: {
        status: 'active'
      },
      include: [{
        model: User,
        as: 'manager',
        attributes: ['id', 'username']
      }],
      attributes: [
        'id', 
        'name', 
        'address', 
        'latitude', 
        'longitude',
        'status',
        'storage_capacity',
        'created_at',
        'updated_at'
      ]
    });
    
    console.log('获取站点列表成功:', stations);
    res.json(stations);
  } catch (error) {
    console.error('获取站点列表失败:', error);
    res.status(500).json({ error: '获取站点列表失败' });
  }
});

// 获取站点详情
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const station = await Station.findOne({
      where: {
        id: req.params.id,
        status: 'active'
      },
      include: [{
        model: User,
        as: 'manager',
        attributes: ['id', 'username']
      }],
      attributes: [
        'id', 
        'name', 
        'address', 
        'latitude', 
        'longitude',
        'status',
        'storage_capacity',
        'created_at',
        'updated_at'
      ]
    });

    if (!station) {
      return res.status(404).json({ error: '站点不存在' });
    }

    res.json(station);
  } catch (error) {
    console.error('获取站点详情失败:', error);
    res.status(500).json({ error: '获取站点详情失败' });
  }
});

// 站点管理员相关路由
router.get('/profile', isAuthenticated, isStationAdmin, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
    status: req.user.status
  });
});

module.exports = router; 