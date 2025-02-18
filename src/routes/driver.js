const express = require('express');
const router = express.Router();
const { isAuthenticated, isDriver } = require('../middleware/auth');
const { Driver, User, Package, Route, Station } = require('../models');
const { Op } = require('sequelize');
const routeService = require('../services/routeService');

// 获取司机信息
router.get('/info', isAuthenticated, isDriver, async (req, res) => {
  try {
    const driver = await Driver.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'role', 'status']
        }
      ]
    });

    if (!driver) {
      return res.status(404).json({ error: '司机信息不存在' });
    }

    res.json({
      id: driver.id,
      user_id: driver.user_id,
      name: driver.name,
      license_number: driver.license_number,
      status: driver.status,
      rating: driver.rating,
      total_deliveries: driver.total_deliveries,
      total_distance: driver.total_distance,
      user: driver.user
    });
  } catch (error) {
    console.error('获取司机信息失败:', error);
    res.status(500).json({ error: '获取司机信息失败' });
  }
});

// 获取司机统计数据
router.get('/statistics', isAuthenticated, isDriver, async (req, res) => {
  try {
    const driver = await Driver.findOne({
      where: { user_id: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({ error: '司机信息不存在' });
    }

    // 获取今日任务数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTasks = await Route.count({
      where: {
        driver_id: driver.id,
        created_at: {
          [Op.gte]: today
        }
      }
    });

    // 获取今日收入
    const todayEarnings = await Package.sum('price', {
      where: {
        driver_id: driver.id,
        status: 'delivered',
        updated_at: {
          [Op.gte]: today
        }
      }
    });

    res.json({
      todayTasks,
      completedTasks: driver.total_deliveries,
      totalDistance: driver.total_distance,
      todayEarnings: todayEarnings || 0,
      rating: driver.rating
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// 获取司机个人资料
router.get('/profile', isAuthenticated, isDriver, async (req, res) => {
  try {
    const driver = await Driver.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'role', 'status']
        }
      ]
    });

    if (!driver) {
      return res.status(404).json({ error: '司机信息不存在' });
    }

    res.json({
      id: driver.id,
      user_id: driver.user_id,
      name: driver.name,
      license_number: driver.license_number,
      status: driver.status,
      rating: driver.rating,
      total_deliveries: driver.total_deliveries,
      total_distance: driver.total_distance,
      user: driver.user
    });
  } catch (error) {
    console.error('获取司机个人资料失败:', error);
    res.status(500).json({ error: '获取司机个人资料失败' });
  }
});

// 获取可用包裹列表
router.get('/packages', isAuthenticated, isDriver, async (req, res) => {
  try {
    const driver = await Driver.findOne({
      where: { user_id: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({ error: '司机信息不存在' });
    }

    const packages = await Package.findAll({
      where: {
        status: 'pending',
        driver_id: null
      },
      include: [
        {
          model: Route,
          as: 'route',
          required: false
        }
      ]
    });

    res.json({
      data: packages
    });
  } catch (error) {
    console.error('获取可用包裹列表失败:', error);
    res.status(500).json({ error: '获取可用包裹列表失败' });
  }
});

// 接受配送任务
router.post('/routes/accept', isAuthenticated, isDriver, async (req, res) => {
  try {
    const { start_station_id, end_station_id, packages: packageIds } = req.body;
    
    const driver = await Driver.findOne({
      where: { user_id: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({ error: '司机信息不存在' });
    }

    // 验证包裹是否存在且可分配
    const packages = await Package.findAll({
      where: {
        id: packageIds,
        status: 'pending',
        driver_id: null
      }
    });

    if (packages.length !== packageIds.length) {
      return res.status(400).json({ error: '部分包裹不存在或已被分配' });
    }

    // 创建新的配送路线
    const route = await Route.create({
      driver_id: driver.id,
      start_station_id,
      end_station_id,
      status: 'pending'
    });

    // 更新所有包裹信息
    await Promise.all(packages.map(pkg => 
      pkg.update({
        driver_id: driver.id,
        route_id: route.id,
        status: 'assigned'
      })
    ));

    res.json({
      message: '成功接受配送任务',
      route: route
    });
  } catch (error) {
    console.error('接受配送任务失败:', error);
    res.status(500).json({ error: '接受配送任务失败' });
  }
});

// 开始配送
router.post('/routes/start', isAuthenticated, isDriver, async (req, res) => {
  try {
    const { routeId } = req.body;
    if (!routeId) {
      return res.status(400).json({ error: '路线ID不能为空' });
    }

    const driver = await Driver.findOne({
      where: { user_id: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({ error: '司机信息不存在' });
    }

    const route = await Route.findOne({
      where: {
        id: routeId,
        driver_id: driver.id,
        status: 'pending'
      }
    });

    if (!route) {
      return res.status(404).json({ error: '配送路线不存在或状态不正确' });
    }

    // 更新路线状态
    await route.update({
      status: 'in_progress',
      start_time: new Date()
    });

    // 更新相关包裹状态
    await Package.update(
      { status: 'in_delivery' },
      {
        where: {
          route_id: routeId,
          status: 'assigned'
        }
      }
    );

    res.json({
      message: '配送开始',
      route: route
    });
  } catch (error) {
    console.error('开始配送失败:', error);
    res.status(500).json({ error: '开始配送失败' });
  }
});

// 计算最优路径
router.post('/calculate-route', isAuthenticated, isDriver, async (req, res) => {
  try {
    const { start_station_id, end_station_id } = req.body;

    if (!start_station_id || !end_station_id) {
      return res.status(400).json({ error: '起始站点和目标站点不能为空' });
    }

    // 验证站点是否存在
    const [startStation, endStation] = await Promise.all([
      Station.findByPk(start_station_id),
      Station.findByPk(end_station_id)
    ]);

    if (!startStation || !endStation) {
      return res.status(404).json({ error: '站点不存在' });
    }

    // 获取所有可用的包裹和中间站点
    const availablePackages = await Package.findAll({
      where: {
        status: 'pending',
        driver_id: null,
        current_station_id: start_station_id
      },
      include: [
        {
          model: Station,
          as: 'currentStation',
          attributes: ['id', 'name', 'latitude', 'longitude']
        },
        {
          model: Station,
          as: 'origin_station',
          attributes: ['id', 'name', 'latitude', 'longitude']
        },
        {
          model: Station,
          as: 'destination_station',
          attributes: ['id', 'name', 'latitude', 'longitude']
        }
      ]
    });

    // 使用路由服务计算最优路径
    const route = await routeService.optimizeRoute(availablePackages, {
      location: startStation,
      destination: endStation
    });

    if (!route.route) {
      return res.json({
        path: [startStation, endStation],
        distance: 0,
        duration: 0,
        packages: [],
        estimatedEarnings: 0
      });
    }

    res.json({
      path: route.route.stations,
      distance: route.route.distance,
      duration: route.route.duration,
      packages: route.packages,
      estimatedEarnings: route.route.estimatedEarnings
    });
  } catch (error) {
    console.error('计算路径失败:', error);
    res.status(500).json({ error: '计算路径失败: ' + error.message });
  }
});

module.exports = router; 