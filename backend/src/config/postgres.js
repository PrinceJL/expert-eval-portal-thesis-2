const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
    process.env.PG_DB,
    process.env.PG_USER,
    process.env.PG_PASSWORD,
    {
        host: process.env.PG_HOST,
        port: process.env.PG_PORT || 5432,
        dialect: "postgres",
        logging: false
    }
);

module.exports = sequelize;
