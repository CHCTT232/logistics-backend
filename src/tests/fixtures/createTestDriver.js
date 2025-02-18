const db = require('../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function createTestDriver() {
  try {
    console.log('开始创建测试用户...');

    // 检查是否已存在同名用户
    const existingUser = await db.User.findOne({
      where: { username: 'testdriver' },
      raw: false
    });

    if (existingUser) {
      console.log('测试用户已存在，正在删除...');
      await db.User.destroy({
        where: { username: 'testdriver' }
      });
    }

    console.log('正在创建新用户...');
    const hashedPassword = await bcrypt.hash('test123', 10);
    const user = await db.User.create({
      username: 'testdriver',
      password: hashedPassword,
      role: 'driver'
    });

    console.log('用户创建成功，正在创建司机记录...');
    const driver = await db.Driver.create({
      user_id: user.id,
      name: '测试司机',
      phone: '13800138000',
      license_number: 'TEST123',
      status: 'available'
    });

    console.log('司机记录创建成功，正在生成JWT令牌...');
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    console.log('\n=== 创建成功 ===');
    console.log('JWT令牌:', token);
    console.log('用户ID:', user.id);
    console.log('司机ID:', driver.id);
    console.log('用户名: testdriver');
    console.log('密码: test123');
    console.log('=================\n');

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('创建测试用户失败:', error);
    if (error.name === 'SequelizeValidationError') {
      console.error('验证错误:', error.errors);
    }
    if (error.name === 'SequelizeDatabaseError') {
      console.error('数据库错误:', error.parent);
    }
    await db.sequelize.close();
    process.exit(1);
  }
}

// 确保数据库连接成功后再执行
db.sequelize
  .authenticate()
  .then(() => {
    console.log('数据库连接成功');
    createTestDriver();
  })
  .catch(err => {
    console.error('数据库连接失败:', err);
    process.exit(1);
  }); 