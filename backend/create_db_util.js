const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: 'postgres', // Connect to default DB to create new one
});

async function createDb() {
  try {
    await client.connect();
    console.log("Connected to postgres default DB");
    
    // Check if db exists
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${process.env.PG_DB}'`);
    if (res.rowCount === 0) {
        console.log(`Creating database ${process.env.PG_DB}...`);
        await client.query(`CREATE DATABASE "${process.env.PG_DB}"`);
        console.log("Database created successfully.");
    } else {
        console.log("Database already exists.");
    }
  } catch (err) {
    console.error("Error creating database:", err);
  } finally {
    await client.end();
  }
}

createDb();
