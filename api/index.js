const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { sequelize } = require('../src/models');

// 导入路由
const authRoutes = require('../src/routes/authRoutes');
const adminRoutes = require('../src/routes/adminRoutes');
const userRoutes = require('../src/routes/userRoutes');
const stationRoutes = require('../src/routes/stationRoutes');
const driverRoutes = require('../src/routes/driverRoutes');
const stationAdminRoutes = require('../src/routes/stationAdminRoutes');
const customerRoutes = require('../src/routes/customerRoutes');
const trunkRoutes = require('../src/routes/trunkRoutes');

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

// 测试路由
app.get('/api/test', (req, res) => {
  res.json({ message: '后端服务器正常工作' });
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
    message: err.message || '服务器内部错误'
  });
});

// 数据库连接状态
let isDbInitialized = false;

// 初始化数据库连接
async function initializeDatabase() {
  if (isDbInitialized) {
    return;
  }
  
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    await sequelize.sync();
    console.log('数据库同步完成');
    isDbInitialized = true;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 创建处理函数
const handler = async (req, res) => {
  try {
    await initializeDatabase();
    return app(req, res);
  } catch (error) {
    console.error('请求处理失败:', error);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
};

// 导出处理函数
module.exports = handler; 