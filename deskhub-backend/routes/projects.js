const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all projects
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, location, stationcounts FROM projects ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE project
router.post('/', async (req, res) => {
  try {
    const { name, location = null, stationcounts = 0 } = req.body;
    if (!name) return res.status(400).json({ message: 'Project name is required.' });
    const stations = parseInt(stationcounts, 10) || 0;
    const result = await pool.query(
      'INSERT INTO projects (name, location, stationcounts) VALUES ($1, $2, $3) RETURNING id, name, location, stationcounts',
      [name, location, stations]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location = null, stationcounts = 0 } = req.body;
    if (!name) return res.status(400).json({ message: 'Project name is required.' });
    const stations = parseInt(stationcounts, 10) || 0;
    const result = await pool.query(
      'UPDATE projects SET name=$1, location=$2, stationcounts=$3 WHERE id=$4 RETURNING id, name, location, stationcounts',
      [name, location, stations, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM projects WHERE id=$1', [id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
