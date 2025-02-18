const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { User, Station, Package, Driver, Route, SystemSetting } = require('../models');
const { Op, fn, col } = require('sequelize');

// 创建站点管理员账户
router.post('/create-station-admin', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { username, password, stationId } = req.body;

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: '用户名已被使用' });
    }

    // 检查站点是否存在
    const station = await Station.findByPk(stationId);
    if (!station) {
      return res.status(404).json({ error: '站点不存在' });
    }

    // 检查站点是否已有管理员
    if (station.manager_id) {
      return res.status(400).json({ error: '该站点已有管理员' });
    }

    // 创建站点管理员账号
    const hashedPassword = await bcrypt.hash(password, 10);
    const stationAdmin = await User.create({
      username,
      password: hashedPassword,
      role: 'station_admin',
      status: 'active'
    });

    // 更新站点的管理员
    await station.update({ manager_id: stationAdmin.id });

    console.log('站点管理员创建成功:', {
      adminId: stationAdmin.id,
      stationId: station.id
    });

    res.status(201).json({
      message: '站点管理员创建成功',
      stationAdmin: {
        id: stationAdmin.id,
        username: stationAdmin.username,
        status: stationAdmin.status,
        created_at: stationAdmin.created_at
      }
    });
  } catch (error) {
    console.error('创建站点管理员失败:', error);
    res.status(500).json({ error: '创建站点管理员失败: ' + error.message });
  }
});

// 创建站点
router.post('/stations', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, address, latitude, longitude, manager_id } = req.body;

    // 验证必填字段
    if (!name || !address || !latitude || !longitude) {
      return res.status(400).json({ error: '站点名称、地址和坐标都是必填项' });
    }

    // 如果提供了管理员ID，验证该用户是否存在且是站点管理员
    if (manager_id) {
      const manager = await User.findOne({
        where: { id: manager_id, role: 'station_admin' }
      });
      if (!manager) {
        return res.status(400).json({ error: '指定的站点管理员不存在或角色不正确' });
      }
    }

    const station = await Station.create({
      name,
      address,
      latitude,
      longitude,
      manager_id,
      status: 'active'
    });

    res.status(201).json(station);
  } catch (error) {
    console.error('创建站点失败:', error);
    res.status(500).json({ error: '创建站点失败' });
  }
});

// 更新系统设置
router.put('/settings/:key', isAuthenticated, isAdmin, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  try {
    const [setting, created] = await SystemSetting.findOrCreate({
      where: { key },
      defaults: { value }
    });

    if (!created) {
      await setting.update({ value });
    }

    res.json({ message: '系统设置更新成功', setting });
  } catch (error) {
    console.error('更新系统设置失败:', error);
    res.status(500).json({ error: '更新系统设置失败' });
  }
});

// 获取所有系统设置
router.get('/settings', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const settings = await SystemSetting.findAll();
    res.json(settings);
  } catch (error) {
    console.error('获取系统设置失败:', error);
    res.status(500).json({ error: '获取系统设置失败' });
  }
});

// 获取所有站点
router.get('/stations', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const stations = await Station.findAll({
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'username']
        }
      ]
    });
    res.json(stations);
  } catch (error) {
    console.error('获取站点列表失败:', error);
    res.status(500).json({ error: '获取站点列表失败' });
  }
});

// 获取系统统计数据
router.get('/statistics', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [
      userCount,
      driverCount,
      stationCount,
      packageCount,
      routeCount,
      activePackages,
      completedPackages
    ] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      Driver.count(),
      Station.count(),
      Package.count(),
      Route.count(),
      Package.count({ where: { status: 'in_transit' } }),
      Package.count({ where: { status: 'delivered' } })
    ]);

    res.json({
      userCount,
      driverCount,
      stationCount,
      packageCount,
      routeCount,
      activePackages,
      completedPackages
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ error: '获取统计信息失败' });
  }
});

// 获取订单趋势
router.get('/order-trend', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const trend = await Package.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', '*'), 'count']
      ],
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      limit: 7,
      raw: true
    });

    res.json(trend);
  } catch (error) {
    console.error('获取订单趋势失败:', error);
    res.status(500).json({ error: '获取订单趋势失败' });
  }
});

// 获取收入趋势
router.get('/income-trend', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const trend = await Package.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('SUM', col('price')), 'amount']
      ],
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      limit: 7,
      raw: true
    });

    res.json(trend);
  } catch (error) {
    console.error('获取收入趋势失败:', error);
    res.status(500).json({ error: '获取收入趋势失败' });
  }
});

// 获取站点管理员列表
router.get('/station-admins', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const stationAdmins = await User.findAll({
      where: { role: 'station_admin' },
      attributes: ['id', 'username', 'created_at'],
      include: [{
        model: Station,
        as: 'managed_station',
        attributes: ['id', 'name', 'address', 'latitude', 'longitude']
      }],
      raw: true,
      nest: true
    });

    res.json(stationAdmins);
  } catch (error) {
    console.error('获取站点管理员列表失败:', error);
    res.status(500).json({ error: '获取站点管理员列表失败' });
  }
});

// 更新站点管理员
router.put('/station-admins/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { stationId } = req.body;

    const stationAdmin = await User.findOne({
      where: { id, role: 'station_admin' }
    });

    if (!stationAdmin) {
      return res.status(404).json({ error: '站点管理员不存在' });
    }

    // 检查站点是否存在
    if (stationId) {
      const station = await Station.findByPk(stationId);
      if (!station) {
        return res.status(404).json({ error: '站点不存在' });
      }

      // 更新站点的管理员
      await Station.update(
        { manager_id: id },
        { where: { id: stationId } }
      );
    }

    res.json({
      message: '站点管理员信息更新成功',
      stationAdmin: {
        id: stationAdmin.id,
        username: stationAdmin.username,
        status: stationAdmin.status,
        updated_at: stationAdmin.updated_at
      }
    });
  } catch (error) {
    console.error('更新站点管理员信息失败:', error);
    res.status(500).json({ error: '更新站点管理员信息失败: ' + error.message });
  }
});

// 删除站点管理员
router.delete('/station-admins/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const stationAdmin = await User.findOne({
      where: { id, role: 'station_admin' }
    });

    if (!stationAdmin) {
      return res.status(404).json({ error: '站点管理员不存在' });
    }

    // 清除相关站点的管理员引用
    await Station.update(
      { manager_id: null },
      { where: { manager_id: id } }
    );

    // 删除管理员账号
    await stationAdmin.destroy();

    res.json({ message: '站点管理员删除成功' });
  } catch (error) {
    console.error('删除站点管理员失败:', error);
    res.status(500).json({ error: '删除站点管理员失败: ' + error.message });
  }
});

// 获取管理员列表
router.get('/admins', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, username = '' } = req.query;
    const offset = (page - 1) * pageSize;

    const where = {
      role: 'admin'
    };

    if (username) {
      where.username = {
        [Op.like]: `%${username}%`
      };
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: ['id', 'username', 'role', 'status', 'created_at'],
      offset,
      limit: parseInt(pageSize),
      order: [['created_at', 'DESC']]
    });

    res.json({
      total: count,
      items: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    res.status(500).json({ error: '获取管理员列表失败' });
  }
});

// 创建管理员
router.post('/admins', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: '用户名已被使用' });
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建管理员账号
    const admin = await User.create({
      username,
      password: hashedPassword,
      role: 'admin',
      status: 'active'
    });

    res.status(201).json({
      message: '管理员创建成功',
      admin: {
        id: admin.id,
        username: admin.username,
        status: admin.status,
        created_at: admin.created_at
      }
    });
  } catch (error) {
    console.error('创建管理员失败:', error);
    res.status(500).json({ error: '创建管理员失败: ' + error.message });
  }
});

// 更新管理员信息
router.put('/admins/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const admin = await User.findOne({
      where: {
        id,
        role: 'admin'
      }
    });

    if (!admin) {
      return res.status(404).json({ error: '管理员不存在' });
    }

    await admin.update({ status });

    res.json({
      message: '管理员信息更新成功',
      admin: {
        id: admin.id,
        username: admin.username,
        status: admin.status,
        updated_at: admin.updated_at
      }
    });
  } catch (error) {
    console.error('更新管理员信息失败:', error);
    res.status(500).json({ error: '更新管理员信息失败: ' + error.message });
  }
});

// 删除管理员
router.delete('/admins/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findOne({
      where: {
        id,
        role: 'admin'
      }
    });

    if (!admin) {
      return res.status(404).json({ error: '管理员不存在' });
    }

    await admin.destroy();

    res.json({ message: '管理员删除成功' });
  } catch (error) {
    console.error('删除管理员失败:', error);
    res.status(500).json({ error: '删除管理员失败: ' + error.message });
  }
});

// 更新站点信息
router.put('/stations/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, address, latitude, longitude, manager_id, status } = req.body;
    const station = await Station.findByPk(req.params.id);

    if (!station) {
      return res.status(404).json({ error: '站点不存在' });
    }

    // 如果要更新站点名称，检查新名称是否已存在
    if (name && name !== station.name) {
      const existingStation = await Station.findOne({ where: { name } });
      if (existingStation) {
        return res.status(400).json({ error: '站点名称已存在' });
      }
    }

    // 如果要更新管理员，验证新管理员是否存在且是站点管理员
    if (manager_id) {
      const manager = await User.findOne({
        where: { id: manager_id, role: 'station_admin' }
      });
      if (!manager) {
        return res.status(400).json({ error: '指定的站点管理员不存在或角色不正确' });
      }
    }

    // 更新站点信息
    await station.update({
      name: name || station.name,
      address: address || station.address,
      latitude: latitude || station.latitude,
      longitude: longitude || station.longitude,
      manager_id: manager_id || station.manager_id,
      status: status || station.status
    });

    res.json({
      message: '站点信息更新成功',
      station: {
        id: station.id,
        name: station.name,
        address: station.address,
        latitude: station.latitude,
        longitude: station.longitude,
        status: station.status,
        manager: station.manager
      }
    });
  } catch (error) {
    console.error('更新站点信息失败:', error);
    res.status(500).json({ error: '更新站点信息失败: ' + error.message });
  }
});

// 删除站点
router.delete('/stations/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const station = await Station.findByPk(req.params.id);
    if (!station) {
      return res.status(404).json({ error: '站点不存在' });
    }

    // 检查站点是否有关联的包裹
    const hasPackages = await Package.findOne({
      where: {
        current_station_id: station.id
      }
    });

    if (hasPackages) {
      return res.status(400).json({ error: '站点还有未处理的包裹，无法删除' });
    }

    await station.destroy();
    res.status(204).end();
  } catch (error) {
    console.error('删除站点失败:', error);
    res.status(500).json({ error: '删除站点失败' });
  }
});

// 更新站点状态
router.put('/stations/:id/status', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const station = await Station.findByPk(id);
    if (!station) {
      return res.status(404).json({ error: '站点不存在' });
    }

    // 验证状态值
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }

    // 更新站点状态
    await station.update({ status });

    res.json({
      message: '站点状态更新成功',
      station: {
        id: station.id,
        name: station.name,
        status: station.status
      }
    });
  } catch (error) {
    console.error('更新站点状态失败:', error);
    res.status(500).json({ error: '更新站点状态失败: ' + error.message });
  }
});

// 设置站点管理员
router.put('/stations/:id/admin', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    const station = await Station.findByPk(id);
    if (!station) {
      return res.status(404).json({ error: '站点不存在' });
    }

    let stationAdmin;
    if (station.manager_id) {
      // 获取现有管理员信息
      stationAdmin = await User.findByPk(station.manager_id);
    } else {
      // 创建新管理员
      // 检查用户名是否已存在
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ error: '用户名已被使用' });
      }

      // 创建站点管理员账号
      const hashedPassword = await bcrypt.hash(password, 10);
      stationAdmin = await User.create({
        username,
        password: hashedPassword,
        role: 'station_admin',
        status: 'active'
      });

      // 更新站点的管理员
      await station.update({ manager_id: stationAdmin.id });
    }

    res.json({
      message: '站点管理员设置成功',
      station: {
        id: station.id,
        name: station.name,
        manager: stationAdmin ? {
          id: stationAdmin.id,
          username: stationAdmin.username
        } : null
      }
    });
  } catch (error) {
    console.error('设置站点管理员失败:', error);
    res.status(500).json({ error: '设置站点管理员失败: ' + error.message });
  }
});

// 创建站点管理员
router.post('/station-managers', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { username, password, email, phone } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码都是必填项' });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建站点管理员账户
    const manager = await User.create({
      username,
      password: hashedPassword,
      email: email || null,
      phone: phone || null,
      role: 'station_manager',
      status: 'active'
    });

    res.status(201).json({
      id: manager.id,
      username: manager.username,
      email: manager.email,
      phone: manager.phone,
      role: manager.role
    });
  } catch (error) {
    console.error('创建站点管理员失败:', error);
    res.status(500).json({ error: '创建站点管理员失败' });
  }
});

// 获取所有站点管理员
router.get('/station-managers', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const managers = await User.findAll({
      where: { role: 'station_manager' },
      include: [
        {
          model: Station,
          as: 'managedStations'
        }
      ]
    });
    res.json(managers);
  } catch (error) {
    console.error('获取站点管理员列表失败:', error);
    res.status(500).json({ error: '获取站点管理员列表失败' });
  }
});

module.exports = router; 