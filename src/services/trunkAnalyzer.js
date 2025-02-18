const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

class TrunkAnalyzer {
  constructor() {
    this.defaultDimensions = {
      width: 1000, // 默认宽度1000mm
      height: 500, // 默认高度500mm
      depth: 800, // 默认深度800mm
    };
  }

  // 分析后备箱空间
  async analyzeTrunkSpace(imageBuffer) {
    try {
      // 使用默认尺寸
      const dimensions = {
        width: this.defaultDimensions.width,
        height: this.defaultDimensions.height,
        depth: this.defaultDimensions.depth,
        volume: this.defaultDimensions.width * this.defaultDimensions.height * this.defaultDimensions.depth
      };

      // 计算可用空间(考虑到后备箱形状不规则，取80%作为可用空间)
      const usableSpace = {
        width: dimensions.width * 0.8,
        height: dimensions.height * 0.8,
        depth: dimensions.depth * 0.8,
        volume: dimensions.volume * 0.8
      };

      return {
        dimensions,
        usableSpace,
        confidence: 0.8
      };
    } catch (error) {
      console.error('后备箱空间分析失败:', error);
      throw new Error('后备箱空间分析失败');
    }
  }

  // 保存调试图片
  async saveDebugImage(imageBuffer, results, outputPath) {
    try {
      await sharp(imageBuffer).toFile(outputPath);
    } catch (error) {
      console.error('调试图片保存失败:', error);
    }
  }
}

module.exports = new TrunkAnalyzer(); 