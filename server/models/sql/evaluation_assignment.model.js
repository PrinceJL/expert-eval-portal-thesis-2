module.exports = (sequelize, DataTypes) => {
    const EvaluationAssignment = sequelize.define('EvaluationAssignment', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        group: {
            type: DataTypes.STRING,
            allowNull: true
            // The organization or group assigned to this evaluation
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: true
            // FK to User defined in associations. Will store the particular user who submitted it.
        },
        output_id: {
            type: DataTypes.UUID,
            allowNull: false
            // FK to EvaluationOutput defined in associations
        },
        scoring_ids: {
            type: DataTypes.JSON,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED'),
            defaultValue: 'PENDING'
        },
        assigned_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        deadline: {
            type: DataTypes.DATE
        },
        completed_at: {
            type: DataTypes.DATE
        },
        scoring_ids: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: []
        },
        scoring_snapshot: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: []
        },
        draft_submission: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        final_submission: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        final_submitted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        last_draft_saved_at: {
            type: DataTypes.DATE
        },
        submitted_at: {
            type: DataTypes.DATE
        },
        is_locked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        distress_detection: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        error_severity: {
            type: DataTypes.JSONB,
            allowNull: true
        }
    }, {
        tableName: 'evaluation_assignments',
        timestamps: true
    });

    return EvaluationAssignment;
};
