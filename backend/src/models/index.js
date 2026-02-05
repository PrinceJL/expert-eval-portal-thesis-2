const sequelize = require("../config/postgres");
const { DataTypes } = require("sequelize");

// SQL Models
const User = require("./sql/user.model")(sequelize, DataTypes);
const Assignment = require("./sql/assignment.model")(sequelize, DataTypes);
const PageMaintenance = require("./page_maintanance.model");
// Models to be implemented
// const ModelVersion = require("./sql/model_version.model")(sequelize, DataTypes);
// const EvaluationPaper = require("./sql/evaluation_paper.model")(sequelize, DataTypes);

// Define SQL Relations
User.hasMany(Assignment, { foreignKey: "expertId", as: "assignments" });
Assignment.belongsTo(User, { foreignKey: "expertId", as: "expert" });

// Mongo Models
const EvaluationResponse = require("./mongo/evaluation.model");
const Message = require("./mongo/message.model");
const Notification = require("./mongo/notification.model");
const SessionCache = require("./mongo/session.model");
const AuditLog = require("./mongo/audit_log.model");

module.exports = {
    sql: {
        sequelize,
        User,
        Assignment,
        PageMaintenance,
    },
    mongo: {
        EvaluationResponse,
        Message,
        Notification,
        SessionCache,
        AuditLog
    }
};
