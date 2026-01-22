const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all units with item and model names
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.*, 
        i.name AS item_name, 
        m.model_name AS model_name
      FROM units u
      LEFT JOIN items i ON u.item_id = i.id
      LEFT JOIN models m ON u.model_id = m.id
      ORDER BY u.id DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching units:', err);
    res.status(500).send('Server error');
  }
});

// GET single unit by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        u.*, 
        i.name AS item_name, 
        m.model_name AS model_name
      FROM units u
      LEFT JOIN items i ON u.item_id = i.id
      LEFT JOIN models m ON u.model_id = m.id
      WHERE u.id = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [id]);
    if (!result.rows.length) return res.status(404).send('Not found');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching unit by id:', err);
    res.status(500).send('Server error');
  }
});

// POST new unit
router.post('/', async (req, res) => {
  try {
    const {
      item_id,
      model_id,
      serial_number,
      brand,
      purchase_date,
      last_calibration,
      next_calibration,
      po_number,
      invoice_number,
      invoice_date,
      amount,
      subscription_info,
      remarks,
      remarks1,
      remarks2,
      last_updated_by,
      remarks3
    } = req.body;

    const query = `
      INSERT INTO units (
        item_id, model_id, serial_number, brand,
        purchase_date, last_calibration, next_calibration,
        po_number, invoice_number, invoice_date, amount,
        subscription_info, remarks, remarks1, remarks2, remarks3, last_updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *
    `;

    const values = [
      item_id,
      model_id,
      serial_number,
      brand,
      purchase_date,
      last_calibration,
      next_calibration,
      po_number,
      invoice_number,
      invoice_date,
      amount,
      subscription_info,
      remarks,
      remarks1,
      remarks2,
      remarks3,
      last_updated_by
    ];

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating unit:', err);
    res.status(500).send('Server error');
  }
});

// PUT (update) unit
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item_id,
      model_id,
      serial_number,
      brand,
      purchase_date,
      last_calibration,
      next_calibration,
      po_number,
      invoice_number,
      invoice_date,
      amount,
      subscription_info,
      remarks,
      remarks1,
      remarks2,
      last_updated_by,
      remarks3
    } = req.body;

    const query = `
      UPDATE units SET
        item_id = $1,
        model_id = $2,
        serial_number = $3,
        brand = $4,
        purchase_date = $5,
        last_calibration = $6,
        next_calibration = $7,
        po_number = $8,
        invoice_number = $9,
        invoice_date = $10,
        amount = $11,
        subscription_info = $12,
        remarks = $13,
        remarks1 = $14,
        remarks2 = $15,
        remarks3 = $16,
        last_updated_by = $17,
        last_updated_on = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *
    `;

    const values = [
      item_id,
      model_id,
      serial_number,
      brand,
      purchase_date,
      last_calibration,
      next_calibration,
      po_number,
      invoice_number,
      invoice_date,
      amount,
      subscription_info,
      remarks,
      remarks1,
      remarks2,
      remarks3,
      last_updated_by,
      id
    ];

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating unit:', err);
    res.status(500).send('Server error');
  }
});

// DELETE unit
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM units WHERE id = $1', [id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting unit:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
