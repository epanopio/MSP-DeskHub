const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'deskhub',
  password: 'your_password_here',
  port: 5432,
});

module.exports = pool;
