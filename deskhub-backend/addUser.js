// addUser.js
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

// TODO: Update database credentials below
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "deskhub",
  password: "S0lut10n!",
  port: 5432,
});

async function createUser(username, password) {
  try {
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
      [username, hash]
    );

    console.log(`✅ User '${username}' added successfully.`);
  } catch (err) {
    console.error("❌ Error creating user:", err);
  } finally {
    pool.end();
  }
}

// Change these to create your admin account
createUser("deskhubadmin", "admin123");
