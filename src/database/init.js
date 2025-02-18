const { Sequelize } = require('sequelize');
const config = require('../config/database');
const User = require('../models/user');
const Driver = require('../models/driver');
const Station = require('../models/station');
const Package = require('../models/package');
const TrunkAnalysis = require('../models/trunkAnalysis');
const SystemSetting = require('../models/systemSetting');
const crypto = require('crypto');

// 创建 Sequelize 实例
const sequelize = new Sequelize(config);

// 初始化数据库
async function initDatabase() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 同步所有模型到数据库
    await sequelize.sync({ force: false, alter: true });
    console.log('数据库表同步完成');

    // 检查是否存在管理员账号
    const adminCount = await User.count({ where: { role: 'admin' } });
    
    if (adminCount === 0) {
      console.log('未找到管理员账号，创建初始管理员...');
      // 创建初始管理员账号
      const adminPassword = crypto.createHash('sha256').update('admin').digest('hex');
      
      await User.create({
        username: 'admin',
        password: adminPassword,
        email: 'admin@example.com',
        phone: '13800000000',
        role: 'admin',
        status: 'active'
      });
      
      console.log('初始管理员账号创建成功');
    } else {
      console.log('管理员账号已存在，跳过创建');
    }

  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

module.exports = {
  sequelize,
  initDatabase
}; 