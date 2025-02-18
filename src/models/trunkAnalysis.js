const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TrunkAnalysis = sequelize.define('TrunkAnalysis', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    vehicle_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'vehicles',
        key: 'id'
      }
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'drivers',
        key: 'id'
      }
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: false
    },
    available_length: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    available_width: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    available_height: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    available_weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    analysis_result: {
      type: DataTypes.JSON,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'trunk_analyses',
    underscored: true,
    timestamps: true
  });

  TrunkAnalysis.associate = function(models) {
    // 后备箱分析属于一个车辆
    TrunkAnalysis.belongsTo(models.Vehicle, {
      foreignKey: 'vehicle_id',
      as: 'vehicle'
    });

    // 后备箱分析属于一个司机
    TrunkAnalysis.belongsTo(models.Driver, {
      foreignKey: 'driver_id',
      as: 'driver'
    });
  };

  return TrunkAnalysis;
}; 