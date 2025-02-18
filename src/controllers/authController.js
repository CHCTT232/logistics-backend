const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Driver } = require('../models');
const { JWT_SECRET } = require('../config');
const { sequelize } = require('../models');

// 用户注册
exports.register = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    console.log('注册请求数据:', { username, role });

    // 检查必要字段
    if (!username || !password || !role) {
      console.log('缺少必要字段');
      return res.status(400).json({ error: '缺少必要字段' });
    }

    // 检查用户类型是否有效
    if (!['user', 'driver'].includes(role)) {
      console.log('无效的用户类型:', role);
      return res.status(400).json({ error: '无效的用户类型' });
    }

    // 检查用户是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      console.log('用户名已被使用:', username);
      return res.status(400).json({ error: '用户名已被使用' });
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('密码加密完成');

    // 开启事务
    const result = await sequelize.transaction(async (t) => {
      console.log('开始创建用户事务');
      
      // 创建用户
      const user = await User.create({
        username,
        password: hashedPassword,
        role,
        status: 'active'
      }, { transaction: t });
      
      console.log('用户创建成功:', user.id);

      // 如果是司机，创建司机记录
      if (role === 'driver') {
        console.log('开始创建司机记录');
        try {
          const driver = await Driver.create({
            user_id: user.id,
            status: 'offline'
          }, { transaction: t });
          console.log('司机记录创建成功:', driver.id);
        } catch (driverError) {
          console.error('创建司机记录失败:', driverError);
          throw driverError;
        }
      }

      return user;
    });

    console.log('事务完成，用户注册成功:', result.id);

    // 生成JWT令牌
    const token = jwt.sign(
      { id: result.id, role: result.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: '注册成功',
      user: {
        id: result.id,
        username: result.username,
        role: result.role,
        status: result.status
      },
      token
    });
  } catch (error) {
    console.error('注册失败，详细错误:', error);
    console.error('错误堆栈:', error.stack);
    if (error.name === 'SequelizeValidationError') {
      console.error('数据验证错误:', error.errors);
      res.status(400).json({ error: '数据验证失败', details: error.errors });
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      console.error('外键约束错误:', error.fields);
      res.status(400).json({ error: '关联数据错误', details: error.fields });
    } else {
      res.status(500).json({ error: '注册失败: ' + error.message });
    }
  }
};

// 用户登录
exports.login = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // 检查必要字段
    if (!username || !password || !role) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    // 检查用户是否存在
    const user = await User.findOne({
      where: { username },
      include: role === 'driver' ? [{ model: Driver, as: 'driver' }] : []
    });

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 检查用户角色是否匹配
    if (user.role !== role) {
      return res.status(403).json({ error: '无权访问该角色' });
    }

    // 检查用户状态
    if (user.status !== 'active') {
      return res.status(403).json({ error: '账号已被禁用' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成 JWT token，包含更多用户信息
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        created_at: user.created_at
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('生成的token:', token);
    console.log('用户信息:', {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status
    });

    // 返回用户信息和 token
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        ...(role === 'driver' && user.driver && {
          driver: {
            id: user.driver.id,
            name: user.driver.name,
            license_number: user.driver.license_number,
            status: user.driver.status
          }
        })
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败: ' + error.message });
  }
};

// 用户退出登录
exports.logout = async (req, res) => {
  try {
    // 这里可以添加一些清理工作，比如将用户的token加入黑名单等
    // 但由于我们使用的是JWT，客户端只需要删除本地存储的token即可
    res.json({ message: '退出登录成功' });
  } catch (error) {
    console.error('退出登录失败:', error);
    res.status(500).json({ error: '退出登录失败: ' + error.message });
  }
}; 