const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const TrunkAnalysis = sequelize.define('TrunkAnalysis', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    driverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Drivers',
        key: 'id'
      }
    },
    photoPath: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '后备箱照片路径'
    },
    dimensions: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: '分析结果，包含尺寸和体积信息'
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: '分析结果置信度'
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
      comment: '分析状态'
    },
    errorMessage: {
      type: DataTypes.STRING,
      comment: '错误信息'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'trunk_analyses',
    timestamps: true,
    indexes: [
      {
        name: 'idx_driver_created',
        fields: ['driverId', 'createdAt']
      }
    ]
  })

  TrunkAnalysis.associate = (models) => {
    TrunkAnalysis.belongsTo(models.Driver, {
      foreignKey: 'driverId',
      as: 'driver'
    })
  }

  return TrunkAnalysis
} 