const TrunkAnalyzer = require('../src/services/trunkAnalyzer');
const fs = require('fs');
const path = require('path');

describe('TrunkAnalyzer', () => {
  let imageBuffer;

  beforeAll(async () => {
    // 读取测试图片
    imageBuffer = fs.readFileSync(path.join(__dirname, 'fixtures/test_trunk.jpg'));
  });

  test('should preprocess image correctly', async () => {
    const tensor = await TrunkAnalyzer.preprocessImage(imageBuffer);
    expect(tensor.shape).toEqual([1, 640, 640, 3]);
  });

  test('should analyze trunk space', async () => {
    const result = await TrunkAnalyzer.analyzeTrunkSpace(imageBuffer);
    
    expect(result).toHaveProperty('dimensions');
    expect(result).toHaveProperty('usableSpace');
    expect(result).toHaveProperty('confidence');

    expect(result.dimensions).toHaveProperty('width');
    expect(result.dimensions).toHaveProperty('height');
    expect(result.dimensions).toHaveProperty('depth');
    expect(result.dimensions).toHaveProperty('volume');

    expect(result.usableSpace).toHaveProperty('width');
    expect(result.usableSpace).toHaveProperty('height');
    expect(result.usableSpace).toHaveProperty('depth');
    expect(result.usableSpace).toHaveProperty('volume');

    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  test('should handle invalid image', async () => {
    const invalidBuffer = Buffer.from('invalid image data');
    const result = await TrunkAnalyzer.analyzeTrunkSpace(invalidBuffer);
    
    // 应该返回默认值
    expect(result.dimensions.width).toBe(1000);
    expect(result.dimensions.height).toBe(500);
    expect(result.dimensions.depth).toBe(800);
    expect(result.confidence).toBe(0.6);
  });
}); 