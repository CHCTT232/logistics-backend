const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Route = sequelize.define('Route', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'drivers',
        key: 'id'
      }
    },
    start_station_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'stations',
        key: 'id'
      }
    },
    end_station_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'stations',
        key: 'id'
      }
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    distance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    estimated_duration: {
      type: DataTypes.INTEGER,  // 以分钟为单位
      allowNull: false
    },
    actual_duration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    path: {
      type: DataTypes.JSON,
      allowNull: false
    },
    earnings: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'routes',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['driver_id']
      },
      {
        fields: ['start_station_id']
      },
      {
        fields: ['end_station_id']
      },
      {
        fields: ['status']
      }
    ]
  });

  Route.associate = function(models) {
    // 路线属于一个司机
    Route.belongsTo(models.Driver, {
      foreignKey: 'driver_id',
      as: 'driver'
    });

    // 路线有一个起始站点
    Route.belongsTo(models.Station, {
      foreignKey: 'start_station_id',
      as: 'startStation'
    });

    // 路线有一个目的站点
    Route.belongsTo(models.Station, {
      foreignKey: 'end_station_id',
      as: 'endStation'
    });

    // 路线包含多个包裹
    Route.hasMany(models.Package, {
      foreignKey: 'route_id',
      as: 'packages'
    });
  };

  return Route;
}; 