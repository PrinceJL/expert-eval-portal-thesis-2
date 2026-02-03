const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

const ModelVersion = sequelize.define('ModelVersion', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    modelName: {
        type: DataTypes.STRING,
        allowNull: false
        // e.g., "Context-Aware Chatbot", "GPT-4", "Claude"
    },
    version: {
        type: DataTypes.STRING,
        allowNull: false
        // e.g., "1.0.0", "2024-01"
    },
    description: {
        type: DataTypes.TEXT
    },
    releaseDate: {
        type: DataTypes.DATE
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    configSnapshot: {
        type: DataTypes.JSONB
        // Model configuration at this version
    },
    createdBy: {
        type: DataTypes.UUID,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'model_versions',
    timestamps: true
});

module.exports = ModelVersion;