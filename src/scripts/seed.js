const { sequelize } = require('../models');
const seedStations = require('../seeders/stationSeeder');

async function seed() {
  try {
    // 同步数据库模型
    await sequelize.sync();
    console.log('数据库同步完成');

    // 运行站点种子
    await seedStations();
    console.log('数据初始化完成');
  } catch (error) {
    console.error('数据初始化失败:', error);
  } finally {
    process.exit();
  }
}

seed(); 