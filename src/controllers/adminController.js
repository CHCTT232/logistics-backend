const { User, Order, Station, Driver, Package } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// 获取管理员列表
exports.getAdminList = async (req, res) => {
  try {
    console.log('开始获取管理员列表');
    const { page = 1, pageSize = 10, username = '' } = req.query;
    console.log('查询参数:', { page, pageSize, username });
    
    // 验证参数
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedPageSize = Math.min(100, Math.max(1, parseInt(pageSize) || 10));
    console.log('验证后的参数:', { validatedPage, validatedPageSize });

    // 构建查询条件
    const where = {
      role: 'admin'
    };
    
    if (username && username.trim()) {
      where.username = {
        [Op.like]: `%${username.trim()}%`
      };
    }
    
    console.log('查询条件:', JSON.stringify(where, null, 2));

    try {
      // 查询总数
      console.log('开始查询总数...');
      const total = await User.count({ where });
      console.log('查询到的总数:', total);

      // 计算分页参数
      const offset = (validatedPage - 1) * validatedPageSize;
      console.log('分页参数:', { offset, limit: validatedPageSize });

      // 查询数据
      console.log('开始查询管理员列表...');
      const admins = await User.findAll({
        where,
        attributes: ['id', 'username', 'status', 'created_at', 'updated_at'],
        order: [['created_at', 'DESC']],
        offset,
        limit: validatedPageSize,
        raw: true // 返回纯 JSON 对象
      });
      console.log('查询到的管理员数量:', admins.length);

      // 返回结果
      const result = {
        total,
        items: admins,
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
    console.error('获取管理员列表失败:', error);
    console.error('错误堆栈:', error.stack);
    
    if (error.name === 'SequelizeConnectionError') {
      res.status(500).json({ error: '数据库连接失败' });
    } else if (error.name === 'SequelizeDatabaseError') {
      res.status(500).json({ error: '数据库查询错误: ' + error.message });
    } else {
      res.status(500).json({ error: '获取管理员列表失败: ' + error.message });
    }
  }
};

// 创建管理员
exports.createAdmin = async (req, res) => {
  try {
    console.log('开始创建管理员, 请求数据:', req.body);
    const { username, password, email, phone } = req.body;

    // 验证必填字段
    if (!username || !password || !email || !phone) {
      console.log('缺少必填字段');
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    // 验证用户名格式
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
      console.log('用户名格式不正确');
      return res.status(400).json({ error: '用户名只能包含字母、数字和下划线，长度4-20位' });
    }

    // 验证密码长度
    if (password.length < 6 || password.length > 20) {
      console.log('密码长度不符合要求');
      return res.status(400).json({ error: '密码长度必须在6-20个字符之间' });
    }

    // 验证邮箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log('邮箱格式不正确');
      return res.status(400).json({ error: '请输入正确的邮箱地址' });
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      console.log('手机号格式不正确');
      return res.status(400).json({ error: '请输入正确的手机号码' });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      console.log('用户名已存在');
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      console.log('邮箱已存在');
      return res.status(400).json({ error: '邮箱已被使用' });
    }

    // 检查手机号是否已存在
    const existingPhone = await User.findOne({ where: { phone } });
    if (existingPhone) {
      console.log('手机号已存在');
      return res.status(400).json({ error: '手机号已被使用' });
    }

    // 创建管理员用户
    console.log('开始创建管理员用户');
    const admin = await User.create({
      username,
      password: await bcrypt.hash(password, 10),
      email,
      phone,
      role: 'admin',
      status: 'active'
    });
    console.log('管理员用户创建成功:', admin.id);

    res.status(201).json({
      message: '管理员创建成功',
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        phone: admin.phone,
        status: admin.status
      }
    });
  } catch (error) {
    console.error('创建管理员失败:', error);
    console.error('错误堆栈:', error.stack);
    if (error.name === 'SequelizeValidationError') {
      res.status(400).json({ error: '数据验证失败：' + error.message });
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: '数据已存在：' + error.message });
    } else {
      res.status(500).json({ error: '创建管理员失败：' + error.message });
    }
  }
};

// 更新管理员状态
exports.updateAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 检查状态是否有效
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }

    // 更新状态
    const admin = await User.findOne({
      where: { id, role: 'admin' }
    });

    if (!admin) {
      return res.status(404).json({ error: '管理员不存在' });
    }

    await admin.update({ status });

    res.json({
      message: '管理员状态更新成功',
      admin: {
        id: admin.id,
        username: admin.username,
        status: admin.status
      }
    });
  } catch (error) {
    console.error('更新管理员状态失败:', error);
    res.status(500).json({ error: '更新管理员状态失败' });
  }
};

// 获取管理员统计数据
exports.getStatistics = async (req, res) => {
  try {
    const [
      userCount,
      driverCount,
      stationCount,
      packageCount
    ] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      Driver.count(),
      Station.count(),
      Package.count()
    ]);

    res.json({
      userCount,
      driverCount,
      stationCount,
      packageCount,
      orderCount: 0,  // 暂时返回0，因为还没有实现订单功能
      totalIncome: 0  // 暂时返回0，因为还没有实现订单功能
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
};

// 获取订单趋势数据
exports.getOrderTrend = async (req, res) => {
  try {
    const days = 7; // 获取最近7天的数据
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // 生成示例数据（因为还没有实现订单功能）
    const trend = new Array(days).fill(null).map((_, index) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + index);
      const dateStr = date.toISOString().split('T')[0];
      
      return {
        date: dateStr,
        count: Math.floor(Math.random() * 100),  // 随机生成订单数量
        amount: Math.floor(Math.random() * 10000)  // 随机生成订单金额
      };
    });

    res.json(trend);
  } catch (error) {
    console.error('获取订单趋势数据失败:', error);
    res.status(500).json({ error: '获取订单趋势数据失败' });
  }
};

// 获取收入趋势数据
exports.getIncomeTrend = async (req, res) => {
  try {
    const days = 7; // 获取最近7天的数据
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // 生成示例数据（因为还没有实现订单功能）
    const trend = new Array(days).fill(null).map((_, index) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + index);
      const dateStr = date.toISOString().split('T')[0];
      
      return {
        date: dateStr,
        income: Math.floor(Math.random() * 10000),  // 随机生成收入金额
        driverIncome: Math.floor(Math.random() * 8000),  // 随机生成司机收入
        platformIncome: Math.floor(Math.random() * 2000)  // 随机生成平台收入
      };
    });

    res.json(trend);
  } catch (error) {
    console.error('获取收入趋势数据失败:', error);
    res.status(500).json({ error: '获取收入趋势数据失败' });
  }
}; 