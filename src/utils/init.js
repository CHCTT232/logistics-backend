const bcrypt = require('bcryptjs');
const { User } = require('../models');

// 创建默认管理员账户
exports.createAdminUser = async () => {
  try {
    // 检查是否已存在管理员账户
    const adminExists = await User.findOne({
      where: { role: 'admin' }
    });

    if (!adminExists) {
      // 创建默认管理员账户
      await User.create({
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        status: 'active'
      });
      console.log('默认管理员账户创建成功');
    } else {
      console.log('管理员账户已存在');
    }
  } catch (error) {
    console.error('创建管理员账户失败:', error);
    throw error;
  }
}; 