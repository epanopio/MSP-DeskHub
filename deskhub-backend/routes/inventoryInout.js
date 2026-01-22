const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper to map row to API payload
const mapRow = (r) => ({
  id: r.id,
  inventory: r.inventory,
  date: r.inv_date ? r.inv_date.toISOString().split('T')[0] : null,
  time: r.inv_time,
  from_location: r.from_location,
  to_location: r.to_location,
  item_id: r.item_id,
  brand: r.brand,
  model: r.model,
  unit_serial: r.unit_serial,
  quantity: r.quantity,
  name: r.name
});

// GET all
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, inventory, inv_date, inv_time, from_location, to_location,
             item_id, brand, model, unit_serial, quantity, name
      FROM inventory_inout
      ORDER BY id DESC
    `);
    res.json(result.rows.map(mapRow));
  } catch (err) {
    console.error('Error fetching inventory_inout:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE
router.post('/', async (req, res) => {
  try {
    const {
      inventory,
      date,
      time,
      from_location,
      to_location,
      item_id = null,
      brand = null,
      model = null,
      unit_serial = null,
      quantity = null,
      name = null
    } = req.body;

    if (!inventory) return res.status(400).json({ message: 'Inventory (In/Out) is required.' });

    const result = await pool.query(
      `INSERT INTO inventory_inout
       (inventory, inv_date, inv_time, from_location, to_location, item_id, brand, model, unit_serial, quantity, name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, inventory, inv_date, inv_time, from_location, to_location,
                 item_id, brand, model, unit_serial, quantity, name`,
      [inventory, date || null, time || null, from_location || null, to_location || null,
       item_id, brand || null, model || null, unit_serial || null,
       quantity !== undefined && quantity !== null && quantity !== '' ? Number(quantity) : null,
       name || null]
    );
    res.status(201).json(mapRow(result.rows[0]));
  } catch (err) {
    console.error('Error creating inventory_inout:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      inventory,
      date,
      time,
      from_location,
      to_location,
      item_id = null,
      brand = null,
      model = null,
      unit_serial = null,
      quantity = null,
      name = null
    } = req.body;
    if (!inventory) return res.status(400).json({ message: 'Inventory (In/Out) is required.' });

    const result = await pool.query(
      `UPDATE inventory_inout
       SET inventory=$1, inv_date=$2, inv_time=$3, from_location=$4, to_location=$5,
           item_id=$6, brand=$7, model=$8, unit_serial=$9, quantity=$10, name=$11
       WHERE id=$12
       RETURNING id, inventory, inv_date, inv_time, from_location, to_location,
                 item_id, brand, model, unit_serial, quantity, name`,
      [inventory, date || null, time || null, from_location || null, to_location || null,
       item_id, brand || null, model || null, unit_serial || null,
       quantity !== undefined && quantity !== null && quantity !== '' ? Number(quantity) : null,
       name || null, id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(mapRow(result.rows[0]));
  } catch (err) {
    console.error('Error updating inventory_inout:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory_inout WHERE id=$1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting inventory_inout:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
