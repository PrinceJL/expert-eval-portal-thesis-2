const { DataTypes } = require('sequelize');
const sequelize = require('../config/postgres');
const { sequelize } = require('../config/postgres');

const PageMaintenance = sequelize.define('PageMaintenance', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    pageName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isUnderMaintenance: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    maintenanceMessage: {
        type: DataTypes.TEXT
    },
    scheduledStart: {
        type: DataTypes.DATE
    },
    scheduledEnd: {
        type: DataTypes.DATE
    },
    updatedBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'page_maintenance',
    timestamps: true
});

module.exports = PageMaintenance;