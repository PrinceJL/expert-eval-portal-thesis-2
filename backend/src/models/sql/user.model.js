module.exports = (sequelize, DataTypes) => {
    return sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        group: {
            type: DataTypes.STRING,
            allowNull: false
            // Partner group identifier
        },
        role: {
            type: DataTypes.ENUM('ADMIN', 'EXPERT', 'RESEARCHER'),
            allowNull: false
        },
        passwordHash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        lastLogin: {
            type: DataTypes.DATE
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'users',
        timestamps: true,
        indexes: [{ unique: true, fields: ['username', 'group'] }]
    });
};
