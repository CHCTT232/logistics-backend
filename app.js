const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('./src/config');
const db = require('./src/models');

// 导入路由
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const userRoutes = require('./src/routes/userRoutes');
const stationRoutes = require('./src/routes/stationRoutes');
const driverRoutes = require('./src/routes/driverRoutes');
const stationAdminRoutes = require('./src/routes/stationAdminRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const trunkRoutes = require('./src/routes/trunkRoutes');

const app = express();

// 中间件
app.use(cors({
  origin: 'http://localhost:5175', // 前端开发服务器地址
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 测试路由
app.get('/api/test', (req, res) => {
  res.json({ message: '后端服务器正常工作' });
});

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/station-admin', stationAdminRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/trunk', trunkRoutes);

// 404错误处理
app.use((req, res, next) => {
  res.status(404).json({
    code: 404,
    message: '请求的资源不存在'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误:', err);

  // 处理Sequelize错误
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      code: 400,
      message: '数据验证失败',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      code: 400,
      message: '数据已存在',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // 处理JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      code: 401,
      message: '无效的token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      code: 401,
      message: 'token已过期'
    });
  }

  // 处理文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      code: 400,
      message: '文件大小超出限制'
    });
  }

  // 处理其他错误
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '服务器内部错误'
  });
});

// 初始化数据库并启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await db.sequelize.authenticate();
    console.log('数据库连接成功');

    // 同步数据库模型（首次运行时使用 force: true，之后改回 false）
    await db.sequelize.sync({ force: false });
    console.log('数据库表同步完成');

    // 启动服务器
    app.listen(config.PORT, () => {
      console.log(`服务器运行在 http://localhost:${config.PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app; 