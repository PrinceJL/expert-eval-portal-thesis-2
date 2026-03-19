require('dotenv').config({ path: __dirname + '/.env' });
const connectPostgres = require("./config/postgres");

const sequelize = connectPostgres();

async function fix() {
  try {
    await sequelize.query('ALTER TABLE "evaluation_assignments" ALTER COLUMN "user_id" DROP NOT NULL;');
    console.log('Successfully dropped NOT NULL constraint on user_id inside evaluation_assignments.');
  } catch (err) {
    console.error('Migration Error:', err);
  } finally {
    await sequelize.close();
  }
}

fix();
