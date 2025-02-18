const db = require('../models')
const { calculateDistance } = require('../utils/mapUtils')
const { calculateEarnings } = require('../utils/freightUtils')

class DriverController {
  // 更新后备箱空间信息
  async updateTrunkSpace(req, res) {
    try {
      const { driverId } = req.user
      const { spaceInfo, loadingPlan } = req.body

      // 更新司机的后备箱信息
      await db.Driver.update({
        trunkSpace: spaceInfo,
        currentLoadingPlan: loadingPlan
      }, {
        where: { id: driverId }
      })

      // 更新包裹状态为已分配
      if (loadingPlan?.packages?.length) {
        await db.Package.update({
          status: 'assigned',
          driverId
        }, {
          where: {
            id: loadingPlan.packages.map(pkg => pkg.id)
          }
        })
      }

      res.json({
        code: 200,
        message: '后备箱信息更新成功',
        data: { spaceInfo, loadingPlan }
      })
    } catch (error) {
      console.error('更新后备箱信息失败:', error)
      res.status(500).json({
        code: 500,
        message: '更新后备箱信息失败'
      })
    }
  }

  // 获取当前任务
  async getCurrentTasks(req, res) {
    try {
      const { driverId } = req.user

      const tasks = await db.Package.findAll({
        where: {
          driverId,
          status: ['assigned', 'in_transit']
        },
        include: [
          {
            model: db.Station,
            as: 'pickupStation',
            attributes: ['id', 'name', 'address', 'location']
          },
          {
            model: db.Station,
            as: 'deliveryStation',
            attributes: ['id', 'name', 'address', 'location']
          }
        ],
        order: [['createdAt', 'DESC']]
      })

      res.json({
        code: 200,
        message: '获取当前任务成功',
        data: tasks
      })
    } catch (error) {
      console.error('获取当前任务失败:', error)
      res.status(500).json({
        code: 500,
        message: '获取当前任务失败'
      })
    }
  }

  // 更新任务状态
  async updateTaskStatus(req, res) {
    try {
      const { driverId } = req.user
      const { taskId } = req.params
      const { status } = req.body

      // 检查任务是否属于该司机
      const task = await db.Package.findOne({
        where: {
          id: taskId,
          driverId
        }
      })

      if (!task) {
        return res.status(404).json({
          code: 404,
          message: '任务不存在'
        })
      }

      // 更新任务状态
      await task.update({ status })

      res.json({
        code: 200,
        message: '任务状态更新成功',
        data: { taskId, status }
      })
    } catch (error) {
      console.error('更新任务状态失败:', error)
      res.status(500).json({
        code: 500,
        message: '更新任务状态失败'
      })
    }
  }

  // 更新车辆信息
  async updateVehicleInfo(req, res) {
    try {
      const { driverId } = req.user
      const vehicleInfo = req.body

      await db.Driver.update({
        vehicleInfo
      }, {
        where: { id: driverId }
      })

      res.json({
        code: 200,
        message: '车辆信息更新成功',
        data: vehicleInfo
      })
    } catch (error) {
      console.error('更新车辆信息失败:', error)
      res.status(500).json({
        code: 500,
        message: '更新车辆信息失败'
      })
    }
  }

  // 获取配送历史
  async getDeliveryHistory(req, res) {
    try {
      const { driverId } = req.user
      const { page = 1, pageSize = 10 } = req.query

      const { rows: history, count } = await db.Package.findAndCountAll({
        where: {
          driverId,
          status: 'delivered'
        },
        include: [
          {
            model: db.Station,
            as: 'pickupStation',
            attributes: ['id', 'name', 'address']
          },
          {
            model: db.Station,
            as: 'deliveryStation',
            attributes: ['id', 'name', 'address']
          }
        ],
        order: [['updatedAt', 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize
      })

      res.json({
        code: 200,
        message: '获取配送历史成功',
        data: {
          list: history,
          total: count,
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      })
    } catch (error) {
      console.error('获取配送历史失败:', error)
      res.status(500).json({
        code: 500,
        message: '获取配送历史失败'
      })
    }
  }

  // 获取收益统计
  async getEarningsStats(req, res) {
    try {
      const { driverId } = req.user
      const { startDate, endDate } = req.query

      // 获取指定时间范围内的已完成配送
      const deliveries = await db.Package.findAll({
        where: {
          driverId,
          status: 'delivered',
          updatedAt: {
            [db.Sequelize.Op.between]: [startDate, endDate]
          }
        },
        include: [
          {
            model: db.Station,
            as: 'pickupStation',
            attributes: ['location']
          },
          {
            model: db.Station,
            as: 'deliveryStation',
            attributes: ['location']
          }
        ]
      })

      // 计算总收益
      const totalEarnings = deliveries.reduce((sum, delivery) => {
        const distance = calculateDistance(
          delivery.pickupStation.location,
          delivery.deliveryStation.location
        )
        return sum + calculateEarnings(distance, delivery.weight)
      }, 0)

      res.json({
        code: 200,
        message: '获取收益统计成功',
        data: {
          totalEarnings,
          deliveryCount: deliveries.length,
          startDate,
          endDate
        }
      })
    } catch (error) {
      console.error('获取收益统计失败:', error)
      res.status(500).json({
        code: 500,
        message: '获取收益统计失败'
      })
    }
  }
}

module.exports = new DriverController() 