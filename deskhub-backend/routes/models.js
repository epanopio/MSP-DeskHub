const express = require('express');
const router = express.Router();
const pool = require('../db'); // assumes db is initialized in db.js

// Get all models (with item name)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id,
        m.item_id,
        i.name AS item_name,
        m.model_name AS name,
        m.remarks,
        m.models_remarks1,
        m.updated_on,
        m.updated_by
      FROM models m
      LEFT JOIN items i ON i.id = m.item_id
      ORDER BY m.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching models:', err);
    res.status(500).send('Error fetching models');
  }
});

// Get models by item id
router.get('/by-item/:itemId', async (req, res) => {
  const { itemId } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, model_name AS name FROM models WHERE item_id = $1 ORDER BY model_name',
      [itemId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching models by item:', err);
    res.status(500).send('Error fetching models by item');
  }
});

// Create new model
router.post('/', async (req, res) => {
  const { item_id, model_name, remarks, models_remarks1, updated_by = 'system' } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO models (item_id, model_name, remarks, models_remarks1, updated_on, updated_by)
       VALUES ($1, $2, $3, $4, NOW(), $5)
       RETURNING *`,
      [item_id, model_name, remarks, models_remarks1, updated_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating model:', err);
    res.status(500).send('Error creating model');
  }
});

// Update model
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { item_id, model_name, remarks, models_remarks1, updated_by = 'system' } = req.body;
  try {
    const result = await pool.query(
      `UPDATE models 
       SET item_id = $1, model_name = $2, remarks = $3, models_remarks1 = $4, updated_on = NOW(), updated_by = $5
       WHERE id = $6
       RETURNING *`,
      [item_id, model_name, remarks, models_remarks1, updated_by, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating model:', err);
    res.status(500).send('Error updating model');
  }
});

// Delete model
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM models WHERE id = $1', [id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting model:', err);
    res.status(500).send('Error deleting model');
  }
});

module.exports = router;
