const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT || 5432,
    database: "postgres", // Connect to default DB to create new one
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
});

async function test() {
    try {
        console.log(`Connecting to ${process.env.PG_HOST}:${process.env.PG_PORT} as ${process.env.PG_USER}...`);
        await client.connect();
        console.log('Connected successfully!');

        try {
            await client.query('CREATE DATABASE eval_portal');
            console.log('Database eval_portal created successfully.');
        } catch (dbErr) {
            if (dbErr.code === '42P04') {
                console.log('Database eval_portal already exists.');
            } else {
                throw dbErr;
            }
        }

        await client.end();
    } catch (err) {
        console.error('Operation failed:', err);
    }
}

test();
