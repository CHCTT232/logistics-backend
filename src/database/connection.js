const { Sequelize } = require('sequelize');
const path = require('path');
const config = require('../config');

// 直接使用config中的dbConfig
const sequelize = new Sequelize({
  ...config.dbConfig,
  define: {
    timestamps: true,
    underscored: true,
    createdAt: {
      field: 'created_at',
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      allowNull: false
    },
    updatedAt: {
      field: 'updated_at',
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      allowNull: false
    }
  },
  dialectOptions: {
    // SQLite特定配置
    pragma: {
      foreign_keys: 0 // 禁用外键检查
    }
  }
});

module.exports = sequelize; 