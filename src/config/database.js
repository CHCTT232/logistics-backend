const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: (sql, timing) => {
    console.log('执行SQL:', sql);
    if (timing) console.log('执行时间:', timing, 'ms');
  },
  define: {
    timestamps: true,
    underscored: true,
    underscoredAll: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 5,
    min: parseInt(process.env.DB_POOL_MIN) || 0,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
    idle: parseInt(process.env.DB_POOL_IDLE) || 10000
  },
  query: {
    raw: false
  },
  isolationLevel: process.env.DB_ISOLATION_LEVEL || 'READ COMMITTED',
  dialectOptions: {
    foreignKeys: true
  }
};

console.log('数据库配置:', {
  ...config,
  storage: path.resolve(config.storage)
});

module.exports = config;