const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { Station, User, Package, Route } = require('../models');
const { Op } = require('sequelize');
const { Driver } = require('../models');

// 获取所有站点列表
router.get('/', async (req, res) => {
  try {
    const stations = await Station.findAll({
      attributes: ['id', 'name', 'latitude', 'longitude', 'status', 'address', 'storage_capacity', 'created_at'],
      include: [{
        model: User,
        as: 'manager',
        attributes: ['id', 'username', 'email', 'phone']
      }],
      where: {
        status: 'active'
      }
    });

    // 直接返回站点数组，不包装在 message 中
    res.json(stations);
  } catch (error) {
    console.error('获取站点列表失败:', error);
    res.status(500).json({ error: '获取站点列表失败: ' + error.message });
  }
});

// 获取站点详情
router.get('/:id', async (req, res) => {
  try {
    const station = await Station.findByPk(req.params.id, {
      attributes: ['id', 'name', 'latitude', 'longitude', 'status', 'address', 'storage_capacity', 'created_at'],
      include: [{
        model: User,
        as: 'manager',
        attributes: ['id', 'username', 'email', 'phone']
      }]
    });

    if (!station) {
      return res.status(404).json({ error: '站点不存在' });
    }

    res.json(station);
  } catch (error) {
    console.error('获取站点详情失败:', error);
    res.status(500).json({ error: '获取站点详情失败: ' + error.message });
  }
});

module.exports = router; 