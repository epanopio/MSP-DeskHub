// server.js
const express    = require('express');
const bodyParser = require('body-parser');
const path       = require('path');
const pool       = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

// --- Items API ---
app.get('/api/items', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, remarks, last_updated_on, last_updated_by FROM items ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', async (req, res) => {
  const { name, remarks } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO items (name, remarks, last_updated_by) VALUES ($1, $2, $3) RETURNING id',
      [name, remarks || '', 'system']
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Error creating item:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const { name, remarks } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    await pool.query(
      `UPDATE items
       SET name = $1,
           remarks = $2,
           last_updated_by = $3,
           last_updated_on = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [name, remarks || '', 'system', id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM items WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// --- Models API ---
app.get('/api/models', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id,
              m.item_id,
              i.name AS item_name,
              m.model_name,
              m.remarks,
              m.updated_on,
              m.updated_by
       FROM models m
       JOIN items i ON m.item_id = i.id
       ORDER BY m.id`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching models:', err);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

app.post('/api/models', async (req, res) => {
  const { item_id, model_name, remarks } = req.body;
  if (!item_id || !model_name) {
    return res.status(400).json({ error: 'Item and Model are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO models (item_id, model_name, remarks, updated_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [item_id, model_name, remarks || '', 'system']
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Error creating model:', err);
    res.status(500).json({ error: 'Failed to create model' });
  }
});

app.put('/api/models/:id', async (req, res) => {
  const { id } = req.params;
  const { item_id, model_name, remarks } = req.body;
  if (!item_id || !model_name) {
    return res.status(400).json({ error: 'Item and Model are required' });
  }
  try {
    await pool.query(
      `UPDATE models
       SET item_id = $1,
           model_name = $2,
           remarks = $3,
           updated_by = $4,
           updated_on = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [item_id, model_name, remarks || '', 'system', id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating model:', err);
    res.status(500).json({ error: 'Failed to update model' });
  }
});

app.delete('/api/models/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM models WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting model:', err);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
