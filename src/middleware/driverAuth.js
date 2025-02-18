const db = require('../models');

// 验证用户是否为司机
const driverAuth = (req, res, next) => {
  if (req.user && req.user.role === 'driver') {
    next();
  } else {
    res.status(403).json({ error: '需要司机权限' });
  }
};

module.exports = driverAuth; 