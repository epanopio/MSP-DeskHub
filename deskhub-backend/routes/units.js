const express = require('express');
const router = express.Router();
const pool = require('../db'); // Adjust if your db connection is elsewhere

// GET all units
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM units ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

// POST a new unit
router.post('/', async (req, res) => {
  try {
    const {
      item, model, serial, brand, purchaseDate,
      lastCalibration, nextCalibration, poNumber,
      invoiceNumber, invoiceDate, amount, subscriptionInfo,
      remarks, lastUpdated
    } = req.body;

    const result = await pool.query(
      `INSERT INTO units (
        item, model, serial, brand, purchase_date,
        last_calibration, next_calibration, po_number,
        invoice_number, invoice_date, amount, subscription_info,
        remarks, last_updated
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14
      ) RETURNING *`,
      [
        item, model, serial, brand, purchaseDate,
        lastCalibration, nextCalibration, poNumber,
        invoiceNumber, invoiceDate, amount, subscriptionInfo,
        remarks, lastUpdated
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

// PUT update unit
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item, model, serial, brand, purchaseDate,
      lastCalibration, nextCalibration, poNumber,
      invoiceNumber, invoiceDate, amount, subscriptionInfo,
      remarks, lastUpdated
    } = req.body;

    const result = await pool.query(
      `UPDATE units SET
        item = $1, model = $2, serial = $3, brand = $4,
        purchase_date = $5, last_calibration = $6,
        next_calibration = $7, po_number = $8, invoice_number = $9,
        invoice_date = $10, amount = $11, subscription_info = $12,
        remarks = $13, last_updated = $14
       WHERE id = $15 RETURNING *`,
      [
        item, model, serial, brand, purchaseDate,
        lastCalibration, nextCalibration, poNumber,
        invoiceNumber, invoiceDate, amount, subscriptionInfo,
        remarks, lastUpdated, id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

// DELETE unit
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM units WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

module.exports = router;
