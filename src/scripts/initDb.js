const { sequelize } = require('../models');
const seedStations = require('../seeders/stationSeeder');

async function initializeDatabase() {
  try {
    // 同步数据库结构
    await sequelize.sync({ force: true });
    console.log('数据库结构同步完成');

    // 添加测试数据
    await seedStations();
    console.log('测试数据添加完成');

    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

initializeDatabase(); 