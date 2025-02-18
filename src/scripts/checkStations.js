const { Station } = require('../models');

async function checkStations() {
  try {
    const stations = await Station.findAll();
    console.log('数据库中的站点数据:');
    console.log(JSON.stringify(stations, null, 2));
  } catch (error) {
    console.error('查询站点数据失败:', error);
  } finally {
    process.exit();
  }
}

checkStations(); 