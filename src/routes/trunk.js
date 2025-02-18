const express = require('express');
const router = express.Router();
const { isAuthenticated, isDriver } = require('../middleware/auth');
const trunkController = require('../controllers/trunkController');

// 分析后备箱空间
router.post('/analyze', isAuthenticated, isDriver, trunkController.analyzeTrunkSpace);

// 获取历史分析记录
router.get('/history', isAuthenticated, isDriver, trunkController.getTrunkAnalysisHistory);

// 获取分析详情
router.get('/:id', isAuthenticated, isDriver, trunkController.getTrunkAnalysisDetail);

module.exports = router; 