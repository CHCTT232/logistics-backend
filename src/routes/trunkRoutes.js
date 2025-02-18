const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const trunkController = require('../controllers/trunkController');
const { isAuthenticated } = require('../middleware/auth');
const driverAuth = require('../middleware/driverAuth');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/trunk'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// 分析后备箱照片 (需要司机身份验证)
router.post('/analyze', isAuthenticated, driverAuth, upload.single('photo'), trunkController.analyzeTrunkPhoto);

// 获取分析历史 (需要司机身份验证)
router.get('/history', isAuthenticated, driverAuth, trunkController.getAnalysisHistory);

// 删除分析记录 (需要司机身份验证)
router.delete('/:analysisId', isAuthenticated, driverAuth, trunkController.deleteAnalysis);

module.exports = router; 