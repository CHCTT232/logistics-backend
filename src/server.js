const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const { sequelize } = require('./models');
const { createAdminUser } = require('./utils/init');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS配置
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 中间件
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 注册路由
app.use('/api', routes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误处理中间件捕获到错误:');
  console.error('错误消息:', err.message);
  console.error('错误堆栈:', err.stack);
  console.error('请求URL:', req.url);
  console.error('请求方法:', req.method);
  console.error('请求头:', req.headers);
  console.error('请求体:', req.body);
  
  res.status(500).json({ 
    error: '服务器内部错误',
    message: err.message,
    path: req.url,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
const startServer = async () => {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功');

    console.log('正在同步数据库模型...');
    const force = process.env.DB_FORCE_SYNC === 'true';
    if (force) {
      console.log('警告：数据库将被重置');
    }
    await sequelize.sync({ force });
    console.log('数据库模型同步完成');

    // 创建默认管理员账户和示例数据
    await createAdminUser();
    console.log('初始化数据完成');

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log('环境变量:');
      console.log('- NODE_ENV:', process.env.NODE_ENV);
      console.log('- DB_FORCE_SYNC:', process.env.DB_FORCE_SYNC);
      console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '已设置' : '未设置');
    });
  } catch (error) {
    console.error('启动服务器失败:');
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
};

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:');
  console.error('错误消息:', error.message);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:');
  console.error('原因:', reason);
  console.error('Promise:', promise);
});

startServer(); 