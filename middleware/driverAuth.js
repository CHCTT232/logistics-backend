const db = require('../models')

// 验证用户是否为司机
const driverAuth = async (req, res, next) => {
  try {
    // 从auth中间件获取用户ID
    const userId = req.user.id

    // 查询用户是否为司机
    const driver = await db.Driver.findOne({
      where: { userId }
    })

    if (!driver) {
      return res.status(403).json({
        code: 403,
        message: '权限不足，仅司机可访问此接口'
      })
    }

    // 将司机ID添加到请求对象
    req.user.driverId = driver.id

    next()
  } catch (error) {
    console.error('司机身份验证失败:', error)
    res.status(500).json({
      code: 500,
      message: '司机身份验证失败'
    })
  }
}

module.exports = driverAuth 