const { Station, User } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// 获取站点列表
exports.getStationList = async (req, res) => {
  try {
    console.log('开始获取站点列表');
    console.log('当前用户:', req.user);
    
    const { page = 1, pageSize = 10, name = '', status } = req.query;
    console.log('查询参数:', { page, pageSize, name, status });

    // 验证参数
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedPageSize = Math.min(100, Math.max(1, parseInt(pageSize) || 10));
    console.log('验证后的参数:', { validatedPage, validatedPageSize });
    
    // 构建查询条件
    const where = {};
    
    if (name && name.trim()) {
      where.name = {
        [Op.like]: `%${name.trim()}%`
      };
    }

    if (status && ['active', 'inactive'].includes(status)) {
      where.status = status;
    }

    console.log('查询条件:', JSON.stringify(where, null, 2));

    try {
      // 查询总数
      console.log('开始查询总数...');
      const total = await Station.count({ where });
      console.log('查询到的总数:', total);

      // 计算分页参数
      const offset = (validatedPage - 1) * validatedPageSize;
      console.log('分页参数:', { offset, limit: validatedPageSize });

      // 查询数据
      console.log('开始查询站点列表...');
      const stations = await Station.findAll({
        where,
        include: [{
          model: User,
          as: 'manager',
          attributes: ['id', 'username', 'role', 'status']
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
        ],
        order: [['created_at', 'DESC']],
        offset,
        limit: validatedPageSize,
        raw: false,
        nest: true
      });

      console.log('查询到的站点数量:', stations.length);

      // 格式化返回结果
      const formattedStations = stations.map(station => {
        const plainStation = station.get({ plain: true });
        return {
          id: plainStation.id,
          name: plainStation.name,
          address: plainStation.address,
          latitude: plainStation.latitude,
          longitude: plainStation.longitude,
          status: plainStation.status,
          storage_capacity: plainStation.storage_capacity,
          created_at: plainStation.created_at,
          updated_at: plainStation.updated_at,
          manager: plainStation.manager ? {
            id: plainStation.manager.id,
            username: plainStation.manager.username,
            role: plainStation.manager.role,
            status: plainStation.manager.status
          } : null
        };
      });

      // 返回结果
      const result = {
        total,
        items: formattedStations,
        page: validatedPage,
        pageSize: validatedPageSize,
        totalPages: Math.ceil(total / validatedPageSize)
      };
      console.log('返回结果:', JSON.stringify(result, null, 2));
      
      res.json(result);
    } catch (dbError) {
      console.error('数据库查询错误:', dbError);
      console.error('错误堆栈:', dbError.stack);
      console.error('SQL:', dbError.sql);
      console.error('参数:', dbError.parameters);
      throw new Error('数据库查询错误: ' + dbError.message);
    }
  } catch (error) {
    console.error('获取站点列表失败:', error);
    console.error('错误堆栈:', error.stack);
    
    if (error.name === 'SequelizeConnectionError') {
      res.status(500).json({ error: '数据库连接失败' });
    } else if (error.name === 'SequelizeDatabaseError') {
      res.status(500).json({ error: '数据库查询错误: ' + error.message });
    } else {
      res.status(500).json({ error: '获取站点列表失败: ' + error.message });
    }
  }
};

// 获取站点详情
exports.getStationDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const station = await Station.findOne({
      where: { id },
      include: [{
        model: User,
        as: 'manager',
        attributes: ['id', 'username', 'email', 'phone', 'status']
      }],
      attributes: ['id', 'name', 'address', 'latitude', 'longitude', 'status', 'storage_capacity', 'created_at', 'updated_at']
    });

    if (!station) {
      return res.status(404).json({ error: '站点不存在' });
    }

    res.json(station);
  } catch (error) {
    console.error('获取站点详情失败:', error);
    res.status(500).json({ error: '获取站点详情失败' });
  }
};

// 创建站点
exports.createStation = async (req, res) => {
  try {
    const { name, address, latitude, longitude, manager_id } = req.body;

    // 检查站点名称是否已存在
    const existingStation = await Station.findOne({ where: { name } });
    if (existingStation) {
      return res.status(400).json({ error: '站点名称已存在' });
    }

    // 检查管理员是否存在
    if (manager_id) {
      const manager = await User.findOne({
        where: { id: manager_id, role: 'station_admin' }
      });
      if (!manager) {
        return res.status(400).json({ error: '站点管理员不存在' });
      }
    }

    // 创建站点
    const station = await Station.create({
      name,
      address,
      latitude,
      longitude,
      manager_id,
      status: 'active'
    });

    res.status(201).json({
      message: '站点创建成功',
      station
    });
  } catch (error) {
    console.error('创建站点失败:', error);
    res.status(500).json({ error: '创建站点失败' });
  }
};

// 更新站点信息
exports.updateStation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, manager_id, status } = req.body;

    // 检查站点是否存在
    const station = await Station.findByPk(id);
    if (!station) {
      return res.status(404).json({ error: '站点不存在' });
    }

    // 如果更改了站点名称，检查是否与其他站点重名
    if (name && name !== station.name) {
      const existingStation = await Station.findOne({ where: { name } });
      if (existingStation) {
        return res.status(400).json({ error: '站点名称已存在' });
      }
    }

    // 如果更改了管理员，检查新管理员是否存在
    if (manager_id && manager_id !== station.manager_id) {
      const manager = await User.findOne({
        where: { id: manager_id, role: 'station_admin' }
      });
      if (!manager) {
        return res.status(400).json({ error: '站点管理员不存在' });
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
      message: '站点更新成功',
      station
    });
  } catch (error) {
    console.error('更新站点失败:', error);
    res.status(500).json({ error: '更新站点失败' });
  }
};

// 删除站点
exports.deleteStation = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查站点是否存在
    const station = await Station.findByPk(id);
    if (!station) {
      return res.status(404).json({ error: '站点不存在' });
    }

    // 删除站点
    await station.destroy();

    res.json({
      message: '站点删除成功'
    });
  } catch (error) {
    console.error('删除站点失败:', error);
    res.status(500).json({ error: '删除站点失败' });
  }
};

// 更新站点状态
exports.updateStationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 检查站点是否存在
    const station = await Station.findByPk(id);
    if (!station) {
      return res.status(404).json({ error: '站点不存在' });
    }

    // 检查状态是否有效
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }

    // 更新站点状态
    await station.update({ status });

    res.json({
      message: '站点状态更新成功',
      station
    });
  } catch (error) {
    console.error('更新站点状态失败:', error);
    res.status(500).json({ error: '更新站点状态失败' });
  }
};

// 更新站点管理员
exports.updateStationAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, email, phone } = req.body;

    // 检查站点是否存在
    const station = await Station.findByPk(id);
    if (!station) {
      return res.status(404).json({ error: '站点不存在' });
    }

    let manager;
    if (station.manager_id) {
      // 如果已有管理员，更新管理员信息
      manager = await User.findByPk(station.manager_id);
      if (!manager) {
        return res.status(404).json({ error: '站点管理员不存在' });
      }

      await manager.update({
        email,
        phone
      });
    } else {
      // 如果没有管理员，创建新管理员
      if (!username || !password) {
        return res.status(400).json({ error: '创建新管理员需要用户名和密码' });
      }

      // 检查用户名是否已存在
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ error: '用户名已存在' });
      }

      // 创建新管理员
      const hashedPassword = await bcrypt.hash(password, 10);
      manager = await User.create({
        username,
        password: hashedPassword,
        email,
        phone,
        role: 'station_admin',
        status: 'active'
      });

      // 更新站点的管理员ID
      await station.update({ manager_id: manager.id });
    }

    res.json({
      message: '站点管理员更新成功',
      station: {
        ...station.toJSON(),
        manager: {
          id: manager.id,
          username: manager.username,
          email: manager.email,
          phone: manager.phone
        }
      }
    });
  } catch (error) {
    console.error('更新站点管理员失败:', error);
    res.status(500).json({ error: '更新站点管理员失败' });
  }
}; 