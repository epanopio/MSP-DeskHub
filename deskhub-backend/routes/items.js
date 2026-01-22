const express = require('express');
const router = express.Router();
const pool = require('../db'); // PostgreSQL connection pool

// GET items (all)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT *, items_remarks1 FROM items ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).send('Failed to fetch items.');
  }
});

// POST create an item
router.post('/', async (req, res) => {
  const { name, remarks, items_remarks1, updated_by = 'system' } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO items (name, remarks, items_remarks1, last_updated_on, last_updated_by)
       VALUES ($1, $2, $3, NOW(), $4) RETURNING *`,
      [name, remarks, items_remarks1, updated_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating item:', err);
    res.status(500).send('Error creating item');
  }
});

// PUT update an item
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, remarks, items_remarks1, updated_by = 'system' } = req.body;
  try {
    const result = await pool.query(
      `UPDATE items SET name = $1, remarks = $2, items_remarks1 = $3, last_updated_on = NOW(), last_updated_by = $4 WHERE id = $5 RETURNING *`,
      [name, remarks, items_remarks1, updated_by, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).send('Error updating item');
  }
});

// DELETE an item
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM items WHERE id = $1', [id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).send('Error deleting item');
  }
});

module.exports = router;
