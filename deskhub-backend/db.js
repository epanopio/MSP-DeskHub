// db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',           // your PostgreSQL user
  host: 'localhost',
  database: 'deskhub',     // your database name
  password: 'S0lut10n!',  // your database password
  port: 5432,
});

module.exports = pool;
