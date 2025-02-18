const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = require('./database');

module.exports = {
  // 服务器配置
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // 数据库配置
  DB_CONFIG: dbConfig,

  // JWT配置
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // 高德地图配置
  AMAP_KEY: process.env.AMAP_KEY || '',
  AMAP_SECURITY_CODE: process.env.AMAP_SECURITY_CODE || '',
  AMAP_API: {
    GEOCODE: 'https://restapi.amap.com/v3/geocode/geo',
    DRIVING: 'https://restapi.amap.com/v3/direction/driving',
    DISTANCE: 'https://restapi.amap.com/v3/distance',
    REGEOCODE: 'https://restapi.amap.com/v3/geocode/regeo',
    SEARCH: 'https://restapi.amap.com/v3/place/text',
    AROUND: 'https://restapi.amap.com/v3/place/around'
  },

  // 包裹配置
  PACKAGE_CONFIG: {
    MAX_WEIGHT: parseInt(process.env.PACKAGE_MAX_WEIGHT) || 100, // kg
    THROW_RATIO: parseInt(process.env.PACKAGE_THROW_RATIO) || 6000,
    BASE_PRICE: {
      VOLUME: parseInt(process.env.PACKAGE_BASE_VOLUME) || 64000, // cm³
      DISTANCE: parseInt(process.env.PACKAGE_BASE_DISTANCE) || 50, // km
      PRICE: parseInt(process.env.PACKAGE_BASE_PRICE) || 6 // yuan
    },
    DRIVER_SHARE: parseFloat(process.env.PACKAGE_DRIVER_SHARE) || 0.833 // 5/6
  },

  // 载物箱配置
  TRUNK_CONFIG: {
    PLATE_SIZE: {
      LENGTH: parseInt(process.env.TRUNK_PLATE_LENGTH) || 20,
      WIDTH: parseInt(process.env.TRUNK_PLATE_WIDTH) || 20,
      HEIGHT: parseInt(process.env.TRUNK_PLATE_HEIGHT) || 3
    }
  },

  // 路径规划配置
  ROUTE_CONFIG: {
    MAX_STOPS: parseInt(process.env.ROUTE_MAX_STOPS) || 10, // 每条路线最大站点数
    MAX_DISTANCE: parseInt(process.env.ROUTE_MAX_DISTANCE) || 100, // km
    MAX_DURATION: parseInt(process.env.ROUTE_MAX_DURATION) || 180 // minutes
  },

  // 图像处理配置
  IMAGE_CONFIG: {
    MAX_SIZE: parseInt(process.env.IMAGE_MAX_SIZE) || 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: process.env.IMAGE_ALLOWED_TYPES?.split(',') || ['image/jpeg', 'image/png'],
    UPLOAD_PATH: path.join(__dirname, '../../uploads')
  },

  DATABASE_PATH: process.env.DB_PATH || path.join(__dirname, '../../database/logistics.db')
}; 