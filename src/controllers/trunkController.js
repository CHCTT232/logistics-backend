const TrunkAnalyzer = require('../services/trunkAnalyzer');
const multer = require('multer');
const path = require('path');
const db = require('../models');
const fs = require('fs');
const sharp = require('sharp');
const TrunkAnalysis = require('../models/TrunkAnalysis');
const { analyzeTrunkImage } = require('../utils/trunkAnalysis');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/trunk_photos'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  },
  fileFilter: (req, file, cb) => {
    // 只接受图片文件
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('只允许上传JPG、JPEG、PNG格式的图片'), false);
    }
    cb(null, true);
  }
});

class TrunkController {
  // 分析后备箱照片
  async analyzeTrunkPhoto(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '请上传后备箱照片' });
      }

      const driver = await db.Driver.findOne({
        where: { user_id: req.user.id }
      });

      if (!driver) {
        return res.status(404).json({ error: '找不到司机信息' });
      }

      // 使用 sharp 分析图片
      const image = sharp(req.file.path);
      const metadata = await image.metadata();

      // 计算体积（示例计算）
      const width = metadata.width / 100; // 转换为米
      const height = metadata.height / 100;
      const depth = 1.5; // 假设深度为1.5米
      const volume = width * height * depth;
      const usableVolume = volume * 0.8; // 假设80%可用

      // 创建分析记录
      const analysis = await db.TrunkAnalysis.create({
        driver_id: driver.id,
        photo_url: req.file.path,
        width,
        height,
        depth,
        volume,
        usable_volume: usableVolume,
        analysis_status: 'completed',
        analysis_result: JSON.stringify({
          width,
          height,
          depth,
          volume,
          usable_volume: usableVolume
        })
      });

      res.json({
        message: '分析完成',
        analysis
      });
    } catch (error) {
      console.error('后备箱分析失败:', error);
      res.status(500).json({ error: '后备箱分析失败' });
    }
  }

  // 获取分析历史
  async getAnalysisHistory(req, res) {
    try {
      const driver = await db.Driver.findOne({
        where: { user_id: req.user.id }
      });

      if (!driver) {
        return res.status(404).json({ error: '找不到司机信息' });
      }

      const analyses = await db.TrunkAnalysis.findAll({
        where: { driver_id: driver.id },
        order: [['created_at', 'DESC']]
      });

      res.json(analyses);
    } catch (error) {
      console.error('获取分析历史失败:', error);
      res.status(500).json({ error: '获取分析历史失败' });
    }
  }

  // 删除分析记录
  async deleteAnalysis(req, res) {
    try {
      const driver = await db.Driver.findOne({
        where: { user_id: req.user.id }
      });

      if (!driver) {
        return res.status(404).json({ error: '找不到司机信息' });
      }

      const analysis = await db.TrunkAnalysis.findOne({
        where: {
          id: req.params.analysisId,
          driver_id: driver.id
        }
      });

      if (!analysis) {
        return res.status(404).json({ error: '找不到分析记录' });
      }

      // 删除照片文件
      if (analysis.photo_url && fs.existsSync(analysis.photo_url)) {
        fs.unlinkSync(analysis.photo_url);
      }

      await analysis.destroy();

      res.json({ message: '分析记录已删除' });
    } catch (error) {
      console.error('删除分析记录失败:', error);
      res.status(500).json({ error: '删除分析记录失败' });
    }
  }

  // 分析后备箱空间
  async analyzeTrunkSpace(req, res) {
    try {
      if (!req.files || !req.files.image) {
        return res.status(400).json({ message: '请上传后备箱照片' });
      }

      const image = req.files.image;
      const { width, height, depth } = req.body;

      // 分析后备箱照片
      const analysis = await analyzeTrunkImage(image, { width, height, depth });

      // 保存分析结果
      const trunkAnalysis = await TrunkAnalysis.create({
        driverId: req.user.id,
        imageUrl: analysis.imageUrl,
        availableSpace: analysis.availableSpace,
        dimensions: analysis.dimensions,
        confidence: analysis.confidence
      });

      res.status(201).json(trunkAnalysis);
    } catch (error) {
      console.error('分析后备箱空间失败:', error);
      res.status(500).json({ message: '分析后备箱空间失败' });
    }
  }

  // 获取历史分析记录
  async getTrunkAnalysisHistory(req, res) {
    try {
      const analyses = await TrunkAnalysis.findAll({
        where: { driverId: req.user.id },
        order: [['createdAt', 'DESC']]
      });
      res.json(analyses);
    } catch (error) {
      console.error('获取历史分析记录失败:', error);
      res.status(500).json({ message: '获取历史分析记录失败' });
    }
  }

  // 获取分析详情
  async getTrunkAnalysisDetail(req, res) {
    try {
      const { id } = req.params;
      const analysis = await TrunkAnalysis.findByPk(id);
      
      if (!analysis) {
        return res.status(404).json({ message: '分析记录不存在' });
      }

      if (analysis.driverId !== req.user.id) {
        return res.status(403).json({ message: '无权限查看此分析记录' });
      }

      res.json(analysis);
    } catch (error) {
      console.error('获取分析详情失败:', error);
      res.status(500).json({ message: '获取分析详情失败' });
    }
  }
}

module.exports = new TrunkController(); 