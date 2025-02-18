const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Package = sequelize.define('Package', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tracking_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    receiver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    current_station_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'stations',
        key: 'id'
      }
    },
    route_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'routes',
        key: 'id'
      }
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    length: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    width: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    height: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_transit', 'delivered', 'cancelled'),
      defaultValue: 'pending'
    },
    shipping_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    origin_station_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'stations',
        key: 'id'
      }
    },
    destination_station_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'stations',
        key: 'id'
      }
    },
    receiver_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    receiver_phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    receiver_address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    volume: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    estimated_delivery_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    actual_delivery_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    signature: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
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
    tableName: 'packages',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['sender_id']
      },
      {
        fields: ['receiver_id']
      },
      {
        fields: ['route_id']
      },
      {
        fields: ['current_station_id']
      },
      {
        fields: ['origin_station_id']
      },
      {
        fields: ['destination_station_id']
      },
      {
        fields: ['status']
      },
      {
        unique: true,
        fields: ['tracking_number']
      }
    ]
  })

  Package.associate = (models) => {
    // 包裹属于发送者
    Package.belongsTo(models.User, {
      foreignKey: 'sender_id',
      as: 'sender'
    })

    // 包裹属于接收者
    Package.belongsTo(models.User, {
      foreignKey: 'receiver_id',
      as: 'receiver'
    })

    // 包裹属于当前站点
    Package.belongsTo(models.Station, {
      foreignKey: 'current_station_id',
      as: 'currentStation'
    })

    // 包裹属于路线
    Package.belongsTo(models.Route, {
      foreignKey: 'route_id',
      as: 'route'
    })

    // 包裹属于起始站点
    Package.belongsTo(models.Station, {
      foreignKey: 'origin_station_id',
      as: 'origin_station'
    })

    // 包裹属于目的站点
    Package.belongsTo(models.Station, {
      foreignKey: 'destination_station_id',
      as: 'destination_station'
    })
  }

  function generateTrackingNumber() {
    const prefix = 'PKG'
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `${prefix}${timestamp}${random}`
  }

  return Package
} 