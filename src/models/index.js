const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(config);

// 导入模型定义
const defineUser = require('./user');
const defineDriver = require('./driver');
const defineVehicle = require('./vehicle');
const defineStation = require('./station');
const definePackage = require('./package');
const defineRoute = require('./route');
const defineTrunkAnalysis = require('./trunkAnalysis');
const defineSystemSetting = require('./systemSetting');

// 初始化所有模型
const User = defineUser(sequelize);
const Driver = defineDriver(sequelize);
const Vehicle = defineVehicle(sequelize);
const Station = defineStation(sequelize);
const Package = definePackage(sequelize);
const Route = defineRoute(sequelize);
const TrunkAnalysis = defineTrunkAnalysis(sequelize);
const SystemSetting = defineSystemSetting(sequelize);

// 建立模型之间的关联关系
const models = {
  User,
  Driver,
  Vehicle,
  Station,
  Package,
  Route,
  TrunkAnalysis,
  SystemSetting
};

// 按照依赖顺序建立关联
const modelOrder = [
  User,
  Driver,
  Vehicle,
  Station,
  Route,
  Package,
  TrunkAnalysis,
  SystemSetting
];

modelOrder.forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

module.exports = {
  sequelize,
  ...models
}; 