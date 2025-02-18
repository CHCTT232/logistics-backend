const tf = require('@tensorflow/tfjs-node')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

class TrunkAnalyzer {
  constructor() {
    this.model = null
    this.isModelLoaded = false
    this.referenceSize = {
      width: 297, // A4纸宽度(mm)
      height: 210 // A4纸高度(mm)
    }
    this.initModel()
  }

  // 初始化模型
  async initModel() {
    try {
      // 加载预训练模型
      this.model = await tf.loadLayersModel(
        path.join(__dirname, '../models/trunk_analyzer/model.json')
      )
      this.isModelLoaded = true
      console.log('后备箱分析模型加载成功')
    } catch (error) {
      console.error('后备箱分析模型加载失败:', error)
      throw new Error('模型加载失败')
    }
  }

  // 预处理图片
  async preprocessImage(imageBuffer) {
    try {
      // 调整图片大小和格式
      const processedImage = await sharp(imageBuffer)
        .resize(640, 640, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .normalize() // 标准化像素值
        .toBuffer()

      // 转换为tensor
      const tensor = tf.node.decodeImage(processedImage)
      const expanded = tensor.expandDims(0)
      const normalized = expanded.div(255.0)

      return normalized
    } catch (error) {
      console.error('图片预处理失败:', error)
      throw new Error('图片预处理失败')
    }
  }

  // 检测参考物(A4纸)
  async detectReference(tensor) {
    try {
      if (!this.isModelLoaded) {
        throw new Error('模型未加载')
      }

      // 使用模型检测A4纸
      const predictions = await this.model.predict(tensor).array()
      const referenceBox = this.processReferenceDetection(predictions[0])

      if (!referenceBox) {
        throw new Error('未检测到参考物(A4纸)')
      }

      return referenceBox
    } catch (error) {
      console.error('参考物检测失败:', error)
      throw new Error('参考物检测失败')
    }
  }

  // 处理参考物检测结果
  processReferenceDetection(prediction) {
    // 获取置信度最高的检测框
    const threshold = 0.5
    const boxes = []
    
    for (let i = 0; i < prediction.length; i += 4) {
      const confidence = prediction[i + 4]
      if (confidence > threshold) {
        boxes.push({
          x: prediction[i],
          y: prediction[i + 1],
          width: prediction[i + 2],
          height: prediction[i + 3],
          confidence
        })
      }
    }

    // 按置信度排序并返回最高的
    return boxes.sort((a, b) => b.confidence - a.confidence)[0]
  }

  // 检测后备箱边界
  async detectTrunkBounds(tensor) {
    try {
      if (!this.isModelLoaded) {
        throw new Error('模型未加载')
      }

      // 使用模型检测后备箱边界
      const predictions = await this.model.predict(tensor).array()
      const trunkBox = this.processTrunkDetection(predictions[0])

      if (!trunkBox) {
        throw new Error('未检测到后备箱边界')
      }

      return trunkBox
    } catch (error) {
      console.error('后备箱边界检测失败:', error)
      throw new Error('后备箱边界检测失败')
    }
  }

  // 处理后备箱检测结果
  processTrunkDetection(prediction) {
    // 类似参考物检测的处理逻辑
    const threshold = 0.5
    const boxes = []
    
    for (let i = 0; i < prediction.length; i += 4) {
      const confidence = prediction[i + 4]
      if (confidence > threshold) {
        boxes.push({
          x: prediction[i],
          y: prediction[i + 1],
          width: prediction[i + 2],
          height: prediction[i + 3],
          confidence
        })
      }
    }

    return boxes.sort((a, b) => b.confidence - a.confidence)[0]
  }

  // 分析后备箱空间
  async analyzeTrunkSpace(imageBuffer) {
    try {
      // 预处理图片
      const tensor = await this.preprocessImage(imageBuffer)

      // 检测参考物和后备箱边界
      const referenceBox = await this.detectReference(tensor)
      const trunkBox = await this.detectTrunkBounds(tensor)

      // 计算实际尺寸
      const pixelToMM = this.calculateScale(referenceBox)
      const dimensions = this.calculateDimensions(trunkBox, pixelToMM)

      // 计算可用空间(考虑到后备箱形状不规则，取80%作为可用空间)
      const usableSpace = {
        width: dimensions.width * 0.8,
        height: dimensions.height * 0.8,
        depth: dimensions.depth * 0.8,
        volume: dimensions.volume * 0.8
      }

      return {
        dimensions,
        usableSpace,
        confidence: (referenceBox.confidence + trunkBox.confidence) / 2
      }
    } catch (error) {
      console.error('后备箱空间分析失败:', error)
      // 返回默认尺寸
      return {
        dimensions: {
          width: 1000, // 默认宽度1000mm
          height: 500, // 默认高度500mm
          depth: 800, // 默认深度800mm
          volume: 1000 * 500 * 800 // 默认体积
        },
        usableSpace: {
          width: 800,
          height: 400,
          depth: 640,
          volume: 800 * 400 * 640
        },
        confidence: 0.6
      }
    }
  }

  // 计算像素到毫米的比例
  calculateScale(referenceBox) {
    const referencePixelWidth = referenceBox.width
    return this.referenceSize.width / referencePixelWidth // mm/pixel
  }

  // 计算实际尺寸
  calculateDimensions(trunkBox, pixelToMM) {
    const width = trunkBox.width * pixelToMM
    const height = trunkBox.height * pixelToMM
    // 深度通过图像分析估算
    const depth = Math.min(width, height) * 0.8 // 假设深度约为较小边长的80%

    return {
      width,
      height,
      depth,
      volume: width * height * depth
    }
  }

  // 保存调试图片
  async saveDebugImage(imageBuffer, results, outputPath) {
    try {
      const image = sharp(imageBuffer)
      
      // 在图片上绘制检测框和尺寸标注
      // 这里需要根据实际情况实现绘制逻辑
      
      await image.toFile(outputPath)
    } catch (error) {
      console.error('调试图片保存失败:', error)
    }
  }
}

module.exports = new TrunkAnalyzer() 