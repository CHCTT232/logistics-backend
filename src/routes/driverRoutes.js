const express = require('express');
const router = express.Router();
const { isAuthenticated, isDriver } = require('../middleware/auth');
const { Driver, Vehicle, Package, Station, Route, sequelize, User } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const routeService = require('../services/routeService');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

// 获取所有司机
router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.findAll({
      include: [
        { model: User, as: 'user' },
        { model: Vehicle, as: 'vehicles' }
      ]
    });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: '获取司机列表失败' });
  }
});

// 获取单个司机
router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user' },
        { model: Vehicle, as: 'vehicles' },
        { model: Route, as: 'routes' }
      ]
    });
    if (!driver) {
      return res.status(404).json({ error: '司机不存在' });
    }
    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: '获取司机信息失败' });
  }
});

// 创建司机
router.post('/', async (req, res) => {
  try {
    const driver = await Driver.create(req.body);
    res.status(201).json(driver);
  } catch (error) {
    res.status(400).json({ error: '创建司机失败' });
  }
});

// 更新司机
router.put('/:id', async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: '司机不存在' });
    }
    await driver.update(req.body);
    res.json(driver);
  } catch (error) {
    res.status(400).json({ error: '更新司机信息失败' });
  }
});

// 删除司机
router.delete('/:id', async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: '司机不存在' });
    }
    await driver.destroy();
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: '删除司机失败' });
  }
});

// 获取司机的当前路线
router.get('/:id/current-route', async (req, res) => {
  try {
    const route = await Route.findOne({
      where: {
        driver_id: req.params.id,
        status: 'in_progress'
      },
      include: [
        { model: Driver, as: 'driver' },
        { model: Station, as: 'startStation' },
        { model: Station, as: 'endStation' }
      ]
    });
    if (!route) {
      return res.status(404).json({ error: '没有进行中的路线' });
    }
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: '获取当前路线失败' });
  }
});

// 更新司机位置
router.put('/:id/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: '司机不存在' });
    }
    await driver.update({
      current_location_lat: latitude,
      current_location_lng: longitude
    });
    res.json(driver);
  } catch (error) {
    res.status(400).json({ error: '更新位置失败' });
  }
});

// 获取司机信息
router.get('/profile', isAuthenticated, isDriver, async (req, res) => {
  try {
    const driver = await Driver.findOne({
      where: { user_id: req.user.id },
      include: [{
        model: Vehicle,
        attributes: ['id', 'plate_number', 'type', 'capacity', 'status']
      }]
    });

    if (!driver) {
      return res.status(404).json({ error: '司机信息不存在' });
    }

    res.json(driver);
  } catch (error) {
    console.error('获取司机信息失败:', error);
    res.status(500).json({ error: '获取司机信息失败: ' + error.message });
  }
});

// 更新车辆信息
router.put('/vehicle', isAuthenticated, isDriver, async (req, res) => {
  try {
    const { plate_number, type, capacity } = req.body;

    const driver = await Driver.findOne({
      where: { user_id: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({ error: '司机信息不存在' });
    }

    let vehicle = await Vehicle.findOne({
      where: { driver_id: driver.id }
    });

    if (!vehicle) {
      vehicle = await Vehicle.create({
        driver_id: driver.id,
        plate_number,
        type,
        capacity
      });
    } else {
      await vehicle.update({
        plate_number,
        type,
        capacity
      });
    }

    res.json(vehicle);
  } catch (error) {
    console.error('更新车辆信息失败:', error);
    res.status(500).json({ error: '更新车辆信息失败: ' + error.message });
  }
});

// 上传后备箱照片
router.post('/trunk-photo', isAuthenticated, isDriver, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传照片' });
    }

    const driver = await Driver.findOne({
      where: { user_id: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({ error: '司机信息不存在' });
    }

    let vehicle = await Vehicle.findOne({
      where: { driver_id: driver.id }
    });

    if (!vehicle) {
      return res.status(404).json({ error: '车辆信息不存在' });
    }

    await vehicle.update({
      trunk_image: req.file.filename
    });

    // TODO: 调用图像分析服务计算后备箱空间

    res.json({
      message: '照片上传成功',
      filename: req.file.filename
    });
  } catch (error) {
    console.error('上传照片失败:', error);
    res.status(500).json({ error: '上传照片失败: ' + error.message });
  }
});

// 获取可用任务
router.post('/available-tasks', isAuthenticated, isDriver, async (req, res) => {
  try {
    const { start_station_id, end_station_id } = req.body;

    if (!start_station_id || !end_station_id) {
      return res.status(400).json({ error: '请选择起始站点和目标站点' });
    }

    const driver = await Driver.findOne({
      where: { user_id: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({ error: '司机信息不存在' });
    }

    // 使用迪杰斯特拉算法计算最短路径
    const route = await routeService.calculateShortestPath(
      parseInt(start_station_id),
      parseInt(end_station_id)
    );

    res.json(route);
  } catch (error) {
    console.error('获取可用任务失败:', error);
    res.status(500).json({ error: '获取可用任务失败: ' + error.message });
  }
});

// 接受任务
router.post('/tasks/accept', isAuthenticated, isDriver, async (req, res) => {
  try {
    const { start_station_id, end_station_id, path } = req.body;
    
    if (!start_station_id || !end_station_id || !path || !Array.isArray(path)) {
      return res.status(400).json({ error: '无效的路线信息' });
    }

    // 获取司机信息
    const driver = await Driver.findOne({
      where: { user_id: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({ error: '司机信息不存在' });
    }

    // 检查司机当前状态
    if (driver.status === 'busy') {
      return res.status(400).json({ error: '您当前已有任务在进行中' });
    }

    // 开启事务
    const transaction = await sequelize.transaction();

    try {
      // 更新司机状态为忙碌
      await driver.update(
        { status: 'busy' },
        { transaction }
      );

      // 更新路径上所有待发货包裹的司机ID
      for (const stationId of path) {
        await Package.update(
          { 
            driver_id: driver.id,
            status: 'in_transit'
          },
          { 
            where: { 
              origin_station_id: stationId,
              status: 'pending',
              driver_id: null
            },
            transaction
          }
        );
      }

      // 创建路线记录
      const route = await Route.create({
        driver_id: driver.id,
        start_station_id,
        end_station_id,
        path: JSON.stringify(path),
        status: 'in_progress'
      }, { transaction });

      // 提交事务
      await transaction.commit();

      res.json({ 
        message: '任务接受成功',
        route_id: route.id
      });
    } catch (error) {
      // 如果出错，回滚事务
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('接受任务失败:', error);
    res.status(500).json({ error: '接受任务失败: ' + error.message });
  }
});

// 获取当前任务
router.get('/current-tasks', isAuthenticated, isDriver, async (req, res) => {
  try {
    const driver = await Driver.findOne({
      where: { user_id: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({ error: '司机信息不存在' });
    }

    const packages = await Package.findAll({
      where: {
        driver_id: driver.id,
        status: 'in_transit'
      },
      include: [
        {
          model: Station,
          as: 'origin_station'
        },
        {
          model: Station,
          as: 'destination_station'
        }
      ]
    });

    res.json(packages);
  } catch (error) {
    console.error('获取当前任务失败:', error);
    res.status(500).json({ error: '获取当前任务失败: ' + error.message });
  }
});

// 更新包裹状态
router.put('/packages/:id/status', isAuthenticated, isDriver, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const driver = await Driver.findOne({
      where: { user_id: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({ error: '司机信息不存在' });
    }

    const package = await Package.findOne({
      where: {
        id,
        driver_id: driver.id
      }
    });

    if (!package) {
      return res.status(404).json({ error: '包裹不存在或不属于您' });
    }

    await package.update({ status });

    // 如果司机没有更多在途包裹，将状态更新为空闲
    const inTransitCount = await Package.count({
      where: {
        driver_id: driver.id,
        status: 'in_transit'
      }
    });

    if (inTransitCount === 0) {
      await driver.update({ status: 'available' });
    }

    res.json({ message: '状态更新成功' });
  } catch (error) {
    console.error('更新包裹状态失败:', error);
    res.status(500).json({ error: '更新包裹状态失败: ' + error.message });
  }
});

module.exports = router; 