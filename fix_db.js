require('dotenv').config({ path: './.env' });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.POSTGRES_URI, {
  logging: false,
  dialectOptions: {
    ssl: process.env.DATABASE_URL ? { require: true, rejectUnauthorized: false } : false
  }
});

async function fix() {
  try {
    await sequelize.query('ALTER TABLE evaluation_assignments ALTER COLUMN user_id DROP NOT NULL;');
    console.log('Successfully dropped NOT NULL constraint on user_id inside evaluation_assignments.');
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

fix();
