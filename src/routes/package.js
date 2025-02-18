const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const packageController = require('../controllers/packageController');

// 创建包裹
router.post('/', isAuthenticated, packageController.createPackage);

// 更新包裹
router.put('/:id', isAuthenticated, packageController.updatePackage);

// 删除包裹
router.delete('/:id', isAuthenticated, packageController.deletePackage);

// 获取包裹列表
router.get('/', isAuthenticated, packageController.getPackages);

// 获取包裹详情
router.get('/:id', isAuthenticated, packageController.getPackageDetail);

// 获取包裹追踪信息
router.get('/:id/track', isAuthenticated, packageController.trackPackage);

module.exports = router; 