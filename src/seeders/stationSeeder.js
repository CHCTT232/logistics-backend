const { Station } = require('../models');

async function seedStations() {
  try {
    // 清除现有数据
    await Station.destroy({ where: {} });

    // 创建测试站点数据
    const stations = [
      {
        name: '北京站',
        address: '北京市东城区毛家湾胡同甲13号',
        latitude: 39.902740,
        longitude: 116.427170,
        status: 'active',
        storage_capacity: 2000
      },
      {
        name: '上海站',
        address: '上海市黄浦区沪闵路303号',
        latitude: 31.247230,
        longitude: 121.455840,
        status: 'active',
        storage_capacity: 2000
      },
      {
        name: '广州站',
        address: '广州市越秀区环市西路159号',
        latitude: 23.147350,
        longitude: 113.256610,
        status: 'active',
        storage_capacity: 1500
      },
      {
        name: '深圳站',
        address: '深圳市罗湖区人民南路3038号',
        latitude: 22.545530,
        longitude: 114.117870,
        status: 'active',
        storage_capacity: 1500
      },
      {
        name: '杭州站',
        address: '杭州市上城区站前大道1号',
        latitude: 30.246020,
        longitude: 120.181430,
        status: 'active',
        storage_capacity: 1200
      }
    ];

    // 批量创建站点
    await Station.bulkCreate(stations);

    console.log('站点数据创建成功');
  } catch (error) {
    console.error('创建站点数据失败:', error);
    throw error;
  }
}

module.exports = seedStations; 