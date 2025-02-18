const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Driver = sequelize.define('Driver', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    license_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'offline',
      validate: {
        isIn: [['online', 'offline', 'delivering']]
      }
    },
    current_location: {
      type: DataTypes.JSON,
      allowNull: true
    },
    vehicle_info: {
      type: DataTypes.JSON,
      allowNull: true
    },
    cargo_space: {
      type: DataTypes.JSON,
      allowNull: true
    },
    current_location_lat: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true
    },
    current_location_lng: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 5
      }
    },
    total_deliveries: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_distance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    }
  }, {
    tableName: 'drivers',
    underscored: true,
    timestamps: true
  });

  Driver.associate = function(models) {
    // 司机关联用户
    Driver.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE'
    });

    // 司机拥有多个车辆
    Driver.hasMany(models.Vehicle, {
      foreignKey: 'driver_id',
      as: 'vehicles'
    });

    // 司机有多个路线
    Driver.hasMany(models.Route, {
      foreignKey: 'driver_id',
      as: 'routes'
    });

    Driver.hasMany(models.Package, {
      foreignKey: 'driver_id',
      as: 'packages'
    });
  };

  return Driver;
}; 