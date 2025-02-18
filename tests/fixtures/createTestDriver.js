const db = require('../src/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function createTestDriver() {
  try {
    // 创建测试用户
    const hashedPassword = await bcrypt.hash('test123', 10);
    const user = await db.User.create({
      username: 'testdriver',
      password: hashedPassword,
      role: 'driver',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 创建司机记录
    const driver = await db.Driver.create({
      userId: user.id,
      name: '测试司机',
      phone: '13800138000',
      licenseNumber: 'TEST123',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    console.log('测试用户和司机创建成功');
    console.log('JWT令牌:', token);
    console.log('用户ID:', user.id);
    console.log('司机ID:', driver.id);

    process.exit(0);
  } catch (error) {
    console.error('创建测试用户失败:', error);
    process.exit(1);
  }
}

createTestDriver(); 