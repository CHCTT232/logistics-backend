const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Vehicle = sequelize.define('Vehicle', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'drivers',
        key: 'id'
      }
    },
    plate_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    vehicle_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: false
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false
    },
    manufacture_year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cargo_length: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    cargo_width: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    cargo_height: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    max_weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'maintenance', 'inactive'),
      defaultValue: 'active'
    },
    last_maintenance_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    insurance_info: {
      type: DataTypes.JSON,
      allowNull: true
    },
    registration_expiry: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'vehicles',
    underscored: true,
    timestamps: true
  });

  Vehicle.associate = function(models) {
    // 车辆属于一个司机
    Vehicle.belongsTo(models.Driver, {
      foreignKey: 'driver_id',
      as: 'driver'
    });

    // 车辆有多个后备箱分析记录
    Vehicle.hasMany(models.TrunkAnalysis, {
      foreignKey: 'vehicle_id',
      as: 'trunkAnalyses'
    });
  };

  return Vehicle;
}; 