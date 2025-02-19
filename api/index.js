const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// 配置环境变量
require('dotenv').config({
  path: path.resolve(__dirname, '../.env.production')
});

// 创建Express应用
const app = express();

// CORS 配置
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://sanchuangsai.chenhao.xin',
      'http://localhost:5175'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 中间件
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 导入路由（使用绝对路径）
const authRoutes = require(path.join(__dirname, '../src/routes/authRoutes'));
const adminRoutes = require(path.join(__dirname, '../src/routes/adminRoutes'));
const userRoutes = require(path.join(__dirname, '../src/routes/userRoutes'));
const stationRoutes = require(path.join(__dirname, '../src/routes/stationRoutes'));
const driverRoutes = require(path.join(__dirname, '../src/routes/driverRoutes'));
const stationAdminRoutes = require(path.join(__dirname, '../src/routes/stationAdminRoutes'));
const customerRoutes = require(path.join(__dirname, '../src/routes/customerRoutes'));
const trunkRoutes = require(path.join(__dirname, '../src/routes/trunkRoutes'));

// 测试路由
app.get('/api/test', (req, res) => {
  res.json({ 
    message: '后端服务器正常工作',
    env: process.env.NODE_ENV,
    config: {
      database: process.env.DB_TYPE,
      cors: corsOptions.origin
    }
  });
});

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/station', stationRoutes);
app.use('/api/station-admin', stationAdminRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/trunk', trunkRoutes);

// 404 处理
app.use((req, res, next) => {
  res.status(404).json({ error: '请求的资源不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误:', err);
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '服务器内部错误',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 数据库配置
const { Sequelize } = require('sequelize');
const dbConfig = {
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false, // 禁用日志记录以减少噪音
  define: {
    timestamps: true,
    underscored: true,
    underscoredAll: true
  },
  pool: {
    max: 1,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

// 创建Sequelize实例
const sequelize = new Sequelize(dbConfig);

// 数据库连接状态跟踪
let isDbInitialized = false;
let dbInitializationPromise = null;

// 初始化数据库连接
async function initializeDatabase() {
  if (isDbInitialized) {
    return Promise.resolve();
  }

  if (dbInitializationPromise) {
    return dbInitializationPromise;
  }

  dbInitializationPromise = (async () => {
    try {
      console.log('开始初始化数据库...');
      await sequelize.authenticate();
      console.log('数据库连接成功');
      
      // 导入模型
      console.log('导入数据模型...');
      const models = require('../src/models');
      
      // 同步数据库结构
      console.log('同步数据库结构...');
      await sequelize.sync({ force: true }); // 强制重建表
      console.log('数据库同步完成');
      
      // 初始化基础数据
      console.log('初始化基础数据...');
      await require('../src/seeders/init')(sequelize);
      console.log('基础数据初始化完成');
      
      isDbInitialized = true;
    } catch (error) {
      console.error('数据库初始化失败:', error);
      isDbInitialized = false;
      dbInitializationPromise = null;
      throw error;
    }
  })();

  return dbInitializationPromise;
}

// Serverless处理函数
async function handler(req, res) {
  try {
    // 确保数据库已初始化
    await initializeDatabase();
    
    // 使用Promise包装Express请求处理
    return new Promise((resolve, reject) => {
      app(req, res);
      
      // 监听请求完成
      res.on('finish', () => {
        resolve();
      });
      
      // 监听错误
      res.on('error', (error) => {
        console.error('响应错误:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('请求处理失败:', error);
    // 确保错误响应只发送一次
    if (!res.headersSent) {
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        detail: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

// 导出处理函数
module.exports = handler; 