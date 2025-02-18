const TrunkAnalyzer = require('../services/trunkAnalyzer')
const multer = require('multer')
const path = require('path')
const db = require('../models')
const fs = require('fs')

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/trunk_photos'))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  },
  fileFilter: (req, file, cb) => {
    // 只接受图片文件
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('只允许上传JPG、JPEG、PNG格式的图片'), false)
    }
    cb(null, true)
  }
})

class TrunkController {
  // 分析后备箱照片
  async analyzeTrunkPhoto(req, res) {
    try {
      // 使用multer处理文件上传
      upload.single('photo')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            code: 400,
            message: err.message
          })
        }

        if (!req.file) {
          return res.status(400).json({
            code: 400,
            message: '请上传照片'
          })
        }

        try {
          // 分析照片
          const results = await TrunkAnalyzer.analyzeTrunkSpace(req.file.buffer)

          // 保存分析记录
          const analysis = await db.TrunkAnalysis.create({
            driverId: req.user.driverId,
            photoPath: req.file.path,
            dimensions: results,
            createdAt: new Date()
          })

          // 如果开启调试模式，保存分析结果图片
          if (process.env.DEBUG === 'true') {
            const debugImagePath = path.join(
              __dirname,
              '../uploads/debug',
              'debug-' + path.basename(req.file.filename)
            )
            await TrunkAnalyzer.saveDebugImage(req.file.buffer, results, debugImagePath)
          }

          res.json({
            code: 200,
            message: '分析成功',
            data: {
              ...results,
              id: analysis.id
            }
          })
        } catch (error) {
          console.error('后备箱照片分析失败:', error)
          res.status(500).json({
            code: 500,
            message: '后备箱照片分析失败'
          })
        }
      })
    } catch (error) {
      console.error('文件上传失败:', error)
      res.status(500).json({
        code: 500,
        message: '文件上传失败'
      })
    }
  }

  // 获取分析历史
  async getAnalysisHistory(req, res) {
    try {
      const { driverId } = req.user
      const { page = 1, pageSize = 10 } = req.query

      // 从数据库获取分析历史
      const { rows: history, count } = await db.TrunkAnalysis.findAndCountAll({
        where: { driverId },
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        attributes: ['id', 'dimensions', 'photoPath', 'createdAt']
      })

      res.json({
        code: 200,
        message: '获取分析历史成功',
        data: {
          list: history,
          total: count,
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      })
    } catch (error) {
      console.error('获取分析历史失败:', error)
      res.status(500).json({
        code: 500,
        message: '获取分析历史失败'
      })
    }
  }

  // 删除分析记录
  async deleteAnalysis(req, res) {
    try {
      const { driverId } = req.user
      const { analysisId } = req.params

      // 检查记录是否存在且属于该司机
      const analysis = await db.TrunkAnalysis.findOne({
        where: {
          id: analysisId,
          driverId
        }
      })

      if (!analysis) {
        return res.status(404).json({
          code: 404,
          message: '记录不存在'
        })
      }

      // 删除相关文件
      if (analysis.photoPath) {
        const photoPath = path.join(__dirname, '..', analysis.photoPath)
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath)
        }
      }

      // 删除记录
      await analysis.destroy()

      res.json({
        code: 200,
        message: '删除成功'
      })
    } catch (error) {
      console.error('删除分析记录失败:', error)
      res.status(500).json({
        code: 500,
        message: '删除分析记录失败'
      })
    }
  }
}

module.exports = new TrunkController() 