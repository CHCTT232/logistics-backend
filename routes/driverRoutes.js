const express = require('express')
const router = express.Router()
const driverController = require('../controllers/driverController')
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')

// 所有路由都需要认证和司机角色
router.use(auth)
router.use(checkRole('driver'))

// 后备箱空间管理
router.put('/trunk-space', driverController.updateTrunkSpace)

// 任务管理
router.get('/current-tasks', driverController.getCurrentTasks)
router.put('/tasks/:taskId/status', driverController.updateTaskStatus)

// 车辆信息
router.put('/vehicle', driverController.updateVehicleInfo)

// 配送历史
router.get('/delivery-history', driverController.getDeliveryHistory)

// 收益统计
router.get('/earnings', driverController.getEarningsStats)

module.exports = router 