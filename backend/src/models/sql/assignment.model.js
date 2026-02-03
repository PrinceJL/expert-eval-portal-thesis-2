module.exports = (sequelize, DataTypes) => {
    const EvaluationAssignment = sequelize.define('EvaluationAssignment', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        expertId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        modelVersionId: {
            type: DataTypes.UUID,
            allowNull: false,
            // references: {
            //     model: 'model_versions',
            //     key: 'id'
            // }
            // Commenting out reference until ModelVersion table exists to avoid migration issues
        },
        evaluationPaperId: {
            type: DataTypes.UUID,
            allowNull: false,
            // references: {
            //     model: 'evaluation_papers',
            //     key: 'id'
            // }
            // Commenting out reference until EvaluationPaper table exists
        },
        outputId: {
            type: DataTypes.UUID
            // Reference to model output being evaluated
        },
        status: {
            type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED'),
            defaultValue: 'PENDING'
        },
        assignedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        deadline: {
            type: DataTypes.DATE
        },
        completedAt: {
            type: DataTypes.DATE
        }
    }, {
        tableName: 'evaluation_assignments',
        timestamps: true
    });

    return EvaluationAssignment;
};