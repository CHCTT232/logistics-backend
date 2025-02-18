const express = require('express');
const router = express.Router();
const { isAuthenticated, isUser } = require('../middleware/auth');

// 用户相关路由
router.get('/profile', isAuthenticated, isUser, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
    status: req.user.status
  });
});

module.exports = router; 