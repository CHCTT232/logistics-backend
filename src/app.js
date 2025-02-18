const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcryptjs')
const { sequelize, User, Station } = require('./models')
const config = require('./config')

// 确保必要的目录存在
const dbDir = path.join(__dirname, '../database')
const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(dbDir)) {
  console.log('创建数据库目录:', dbDir)
  fs.mkdirSync(dbDir, { recursive: true })
}
if (!fs.existsSync(uploadsDir)) {
  console.log('创建上传目录:', uploadsDir)
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// 导入路由
const authRoutes = require('./routes/authRoutes')
const adminRoutes = require('./routes/adminRoutes')
const userRoutes = require('./routes/userRoutes')
const stationRoutes = require('./routes/stationRoutes')
const driverRoutes = require('./routes/driverRoutes')
const stationAdminRoutes = require('./routes/stationAdminRoutes')
const customerRoutes = require('./routes/customerRoutes')
const trunkRoutes = require('./routes/trunkRoutes')

const app = express()

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
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// 请求日志中间件
app.use((req, res, next) => {
  console.log('收到请求:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    query: req.query
  })
  next()
})

// 响应日志中间件
app.use((req, res, next) => {
  const originalJson = res.json
  res.json = function(data) {
    console.log('发送响应:', {
      url: req.url,
      statusCode: res.statusCode,
      data: data
    })
    return originalJson.call(this, data)
  }
  next()
})

// 静态文件服务
app.use('/uploads', express.static(uploadsDir))

// 测试路由
app.get('/api/test', (req, res) => {
  res.json({ message: '后端服务器正常工作' })
})

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/user', userRoutes)
app.use('/api/driver', driverRoutes)
app.use('/api/station', stationRoutes)
app.use('/api/station-admin', stationAdminRoutes)
app.use('/api/customer', customerRoutes)
app.use('/api/trunk', trunkRoutes)

// 404 处理
app.use((req, res, next) => {
  res.status(404).json({ error: '请求的资源不存在' })
})

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误:', err)
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '服务器内部错误'
  })
})

// 初始化管理员账号
async function initAdminUser() {
  try {
    const adminUser = await User.findOne({ where: { role: 'admin' } })
    if (!adminUser) {
      console.log('创建管理员账号...')
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await User.create({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        phone: '13800000000',
        role: 'admin',
        status: 'active'
      })
      console.log('管理员账号创建成功')
    } else {
      console.log('管理员账号已存在')
    }
  } catch (error) {
    console.error('初始化管理员账号失败:', error)
    throw error
  }
}

// 初始化示例站点
async function initSampleStations() {
  try {
    const stationCount = await Station.count()
    if (stationCount === 0) {
      console.log('创建示例站点...')
      const sampleStations = [
        {
          name: '北京中心站',
          address: '北京市朝阳区建国路88号',
          longitude: 116.4551,
          latitude: 39.9080,
          status: 'active',
          storage_capacity: 1000000
        },
        {
          name: '上海中心站',
          address: '上海市浦东新区陆家嘴环路1000号',
          longitude: 121.5074,
          latitude: 31.2354,
          status: 'active',
          storage_capacity: 1000000
        },
        {
          name: '广州中心站',
          address: '广州市天河区珠江新城华夏路10号',
          longitude: 113.3306,
          latitude: 23.1196,
          status: 'active',
          storage_capacity: 1000000
        }
      ]

      await Station.bulkCreate(sampleStations)
      console.log('示例站点创建成功')
    } else {
      console.log('已存在站点数据，跳过初始化')
    }
  } catch (error) {
    console.error('初始化示例站点失败:', error)
    throw error
  }
}

// 初始化数据库并启动服务器
async function startServer() {
  try {
    // 初始化数据库
    console.log('正在连接数据库...')
    await sequelize.authenticate()
    console.log('数据库连接成功')

    // 同步数据库模型
    console.log('正在同步数据库模型...')
    // 使用 force 选项重新创建表，注意这会删除现有数据
    // 仅在开发环境使用
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ force: true })
      console.log('数据库表已重新创建')
    } else {
      await sequelize.sync()
      console.log('数据库表同步完成')
    }

    // 初始化管理员账号
    console.log('正在初始化管理员账号...')
    await initAdminUser()

    // 初始化示例站点
    console.log('正在初始化示例站点...')
    await initSampleStations()

    // 启动服务器
    const server = app.listen(config.PORT, () => {
      console.log(`服务器运行在 http://localhost:${config.PORT}`)
      console.log('按 Ctrl+C 停止服务器')
    })

    // 优雅关闭
    process.on('SIGTERM', () => {
      console.log('收到 SIGTERM 信号，正在关闭服务器...')
      server.close(() => {
        console.log('服务器已关闭')
        sequelize.close()
        process.exit(0)
      })
    })

  } catch (error) {
    console.error('服务器启动失败:', error)
    process.exit(1)
  }
}

startServer()

module.exports = app 