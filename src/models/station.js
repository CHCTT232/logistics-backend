const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Station = sequelize.define('Station', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'inactive']]
      }
    },
    manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    storage_capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1000
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
    tableName: 'stations',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['manager_id']
      },
      {
        fields: ['status']
      }
    ]
  });

  Station.associate = function(models) {
    // 站点管理员关联
    Station.belongsTo(models.User, {
      foreignKey: 'manager_id',
      as: 'manager'
    });

    // 作为起始站点的路线
    Station.hasMany(models.Route, {
      foreignKey: 'start_station_id',
      as: 'outgoingRoutes'
    });

    // 作为目的站点的路线
    Station.hasMany(models.Route, {
      foreignKey: 'end_station_id',
      as: 'incomingRoutes'
    });

    // 站点的包裹
    Station.hasMany(models.Package, {
      foreignKey: 'current_station_id',
      as: 'packages'
    });
  };

  return Station;
}; 