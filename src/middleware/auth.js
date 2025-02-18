const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { User } = require('../models');

// 验证用户是否已登录
const isAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('认证头:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const token = authHeader.split(' ')[1];
    console.log('解析的token:', token);

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('解码的token数据:', decoded);

    // 获取用户信息
    const user = await User.findByPk(decoded.id);
    if (!user) {
      console.log('用户不存在:', decoded.id);
      return res.status(401).json({ error: '用户不存在' });
    }

    if (user.status !== 'active') {
      console.log('用户状态不是active:', user.status);
      return res.status(403).json({ error: '账号已被禁用' });
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status
    };
    console.log('验证通过，用户信息:', req.user);
    next();
  } catch (error) {
    console.error('认证失败:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '无效的认证令牌' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '认证令牌已过期' });
    }
    res.status(500).json({ error: '认证失败' });
  }
};

// 验证是否是管理员
const isAdmin = (req, res, next) => {
  console.log('检查管理员权限，用户角色:', req.user?.role);
  if (!req.user || req.user.role !== 'admin') {
    console.log('不是管理员，拒绝访问');
    return res.status(403).json({ error: '需要管理员权限' });
  }
  console.log('是管理员，允许访问');
  next();
};

// 验证是否是站点管理员
const isStationAdmin = (req, res, next) => {
  console.log('检查站点管理员权限，用户角色:', req.user?.role);
  if (!req.user || req.user.role !== 'station_admin') {
    console.log('不是站点管理员，拒绝访问');
    return res.status(403).json({ error: '需要站点管理员权限' });
  }
  console.log('是站点管理员，允许访问');
  next();
};

// 验证是否是司机
const isDriver = (req, res, next) => {
  console.log('检查司机权限，用户角色:', req.user?.role);
  if (!req.user || req.user.role !== 'driver') {
    console.log('不是司机，拒绝访问');
    return res.status(403).json({ error: '需要司机权限' });
  }
  console.log('是司机，允许访问');
  next();
};

// 验证是否是普通用户
const isUser = (req, res, next) => {
  console.log('检查用户权限，用户角色:', req.user?.role);
  if (!req.user || req.user.role !== 'user') {
    console.log('不是普通用户，拒绝访问');
    return res.status(403).json({ error: '需要用户权限' });
  }
  console.log('是普通用户，允许访问');
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin: [isAuthenticated, isAdmin],
  isStationAdmin: [isAuthenticated, isStationAdmin],
  isDriver: [isAuthenticated, isDriver],
  isUser: [isAuthenticated, isUser]
}; 