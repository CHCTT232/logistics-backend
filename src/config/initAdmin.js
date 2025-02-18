const bcrypt = require('bcryptjs');
const { User } = require('../models');

async function initAdmin() {
  try {
    // 检查是否已存在管理员账户
    const adminExists = await User.findOne({
      where: { role: 'admin' }
    });

    if (!adminExists) {
      // 创建管理员账户
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        phone: '13800000000',
        role: 'admin',
        status: 'active'
      });
      console.log('管理员账户创建成功');
    }
  } catch (error) {
    console.error('创建管理员账户失败:', error);
  }
}

module.exports = initAdmin; 