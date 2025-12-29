const express = require('express');
const router = express.Router();
const pool = require('../db'); // PostgreSQL or MySQL connection pool

// GET items (example endpoint)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).send('Failed to fetch items.');
  }
});

module.exports = router;
