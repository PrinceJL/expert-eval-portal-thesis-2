const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

const EvaluationPaper = sequelize.define('EvaluationPaper', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    benchmarkScenario: {
        type: DataTypes.TEXT
        // The legal question/case
    },
    expectedJurisdiction: {
        type: DataTypes.STRING
        // 'HK', 'PH', etc.
    },
    isHighRisk: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
        // Triggers distress detection requirement
    },
    createdBy: {
        type: DataTypes.UUID,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'evaluation_papers',
    timestamps: true
});

module.exports = EvaluationPaper;