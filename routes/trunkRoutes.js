const express = require('express')
const router = express.Router()
const trunkController = require('../controllers/trunkController')
const auth = require('../middleware/auth')
const driverAuth = require('../middleware/driverAuth')

// 分析后备箱照片 (需要司机身份验证)
router.post('/analyze', auth, driverAuth, trunkController.analyzeTrunkPhoto)

// 获取分析历史 (需要司机身份验证)
router.get('/history', auth, driverAuth, trunkController.getAnalysisHistory)

// 删除分析记录 (需要司机身份验证)
router.delete('/:analysisId', auth, driverAuth, trunkController.deleteAnalysis)

module.exports = router 