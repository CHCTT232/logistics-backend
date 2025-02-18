const { User } = require('./src/models');
const crypto = require('crypto');

async function updateAdminPassword() {
  try {
    const hashedPassword = crypto.createHash('sha256').update('admin123').digest('hex');
    await User.update(
      { password: hashedPassword },
      { where: { role: 'admin' } }
    );
    console.log('管理员密码更新成功');
  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    process.exit();
  }
}

updateAdminPassword(); 