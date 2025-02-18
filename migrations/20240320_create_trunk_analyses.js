'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('trunk_analyses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      driver_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'drivers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      photo_path: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: '后备箱照片路径'
      },
      dimensions: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: '分析结果，包含尺寸和体积信息'
      },
      confidence: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: '分析结果置信度'
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
        comment: '分析状态'
      },
      error_message: {
        type: Sequelize.STRING,
        comment: '错误信息'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    })

    // 添加索引
    await queryInterface.addIndex('trunk_analyses', {
      fields: ['driver_id', 'created_at'],
      name: 'idx_driver_created'
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('trunk_analyses')
  }
} 