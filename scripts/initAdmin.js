const bcrypt = require('bcryptjs');
const { User } = require('../src/models');
const db = require('../src/models');

async function initAdmin() {
  try {
    await db.sequelize.authenticate();
    console.log('数据库连接成功');

    // 检查是否已存在管理员账户
    const existingAdmin = await User.findOne({
      where: { username: 'admin' }
    });

    if (existingAdmin) {
      console.log('管理员账户已存在，更新密码');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await existingAdmin.update({
        password: hashedPassword,
        role: 'admin',
        status: 'active'
      });
    } else {
      console.log('创建新的管理员账户');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        status: 'active'
      });
    }

    console.log('管理员账户初始化完成');
    process.exit(0);
  } catch (error) {
    console.error('初始化管理员账户失败:', error);
    process.exit(1);
  }
}

initAdmin(); 