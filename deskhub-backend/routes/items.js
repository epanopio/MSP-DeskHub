// deskhub-backend/routes/items.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all items
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, remarks, last_updated_on, last_updated_by
      FROM items
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// POST create item
router.post('/', async (req, res) => {
  const { name, remarks } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Item name is required' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO items (name, remarks, last_updated_by)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [name, remarks || null, 'system']); // Replace 'system' when login user is available

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Error creating item:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT update item
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { name, remarks } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Item name is required' });
  }

  try {
    await pool.query(`
      UPDATE items
      SET name = $1,
          remarks = $2,
          last_updated_by = $3,
          last_updated_on = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [name, remarks || null, 'system', id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE item
router.delete('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    await pool.query(`DELETE FROM items WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
