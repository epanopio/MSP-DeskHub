const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all projects
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, proj_name, location, location_stn, proj_stn FROM projects ORDER BY id DESC'
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
    const { proj_name, location = null, location_stn = null, proj_stn = 0 } = req.body;
    if (!proj_name) return res.status(400).json({ message: 'Project name is required.' });
    const stations = parseInt(proj_stn, 10) || 0;
    const result = await pool.query(
      'INSERT INTO projects (proj_name, location, location_stn, proj_stn) VALUES ($1, $2, $3, $4) RETURNING id, proj_name, location, location_stn, proj_stn',
      [proj_name, location, location_stn, stations]
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
    const { proj_name, location = null, location_stn = null, proj_stn = 0 } = req.body;
    if (!proj_name) return res.status(400).json({ message: 'Project name is required.' });
    const stations = parseInt(proj_stn, 10) || 0;
    const result = await pool.query(
      'UPDATE projects SET proj_name=$1, location=$2, location_stn=$3, proj_stn=$4 WHERE id=$5 RETURNING id, proj_name, location, location_stn, proj_stn',
      [proj_name, location, location_stn, stations, id]
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
