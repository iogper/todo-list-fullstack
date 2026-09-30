require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool( {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_HOST === '127.0.0.1' ? false : { rejectedUnauthorized: false}
});

module.exports = pool;