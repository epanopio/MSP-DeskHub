// routes/units.js

const express = require('express');
const router = express.Router();

// GET all units
router.get('/', async (req, res) => {
  const pool = req.app.locals.pool;
  try {
    const sql = `
      SELECT u.id,
             u.item_id,
             i.name AS item_name,
             u.model_id,
             m.model_name,
             u.serial_number,
             u.brand,
             u.purchase_date,
             u.last_calibration,
             u.next_calibration,
             u.po_number,
             u.invoice_number,
             u.invoice_date,
             u.amount,
             u.subscription_info,
             u.remarks,
             u.last_updated_on,
             u.last_updated_by
      FROM units u
      LEFT JOIN items i  ON u.item_id  = i.id
      LEFT JOIN models m ON u.model_id = m.id
      ORDER BY u.id DESC
    `;
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching units:', err);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

// POST — create unit
router.post('/', async (req, res) => {
  const pool = req.app.locals.pool;
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
    remarks
  } = req.body;

  if (!item_id || !model_id) {
    return res.status(400).json({ error: 'Item and Model are required' });
  }

  try {
    const sql = `
      INSERT INTO units (
        item_id, model_id, serial_number, brand,
        purchase_date, last_calibration, next_calibration,
        po_number, invoice_number, invoice_date,
        amount, subscription_info, remarks, last_updated_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING id
    `;
    const values = [
      item_id, model_id,
      serial_number || null,
      brand || null,
      purchase_date || null,
      last_calibration || null,
      next_calibration || null,
      po_number || null,
      invoice_number || null,
      invoice_date || null,
      amount || null,
      subscription_info || null,
      remarks || null,
      'system'
    ];
    const result = await pool.query(sql, values);
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Error creating unit:', err);
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

// PUT — update unit
router.put('/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  const id = req.params.id;
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
    remarks
  } = req.body;

  if (!item_id || !model_id) {
    return res.status(400).json({ error: 'Item and Model are required' });
  }

  try {
    const sql = `
      UPDATE units
      SET item_id           = $1,
          model_id          = $2,
          serial_number     = $3,
          brand             = $4,
          purchase_date     = $5,
          last_calibration  = $6,
          next_calibration  = $7,
          po_number         = $8,
          invoice_number    = $9,
          invoice_date      = $10,
          amount            = $11,
          subscription_info = $12,
          remarks           = $13,
          last_updated_by   = $14,
          last_updated_on   = CURRENT_TIMESTAMP
      WHERE id = $15
    `;
    const values = [
      item_id, model_id,
      serial_number || null,
      brand || null,
      purchase_date || null,
      last_calibration || null,
      next_calibration || null,
      po_number || null,
      invoice_number || null,
      invoice_date || null,
      amount || null,
      subscription_info || null,
      remarks || null,
      'system',
      id
    ];
    await pool.query(sql, values);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating unit:', err);
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

// DELETE — remove unit
router.delete('/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  const id = req.params.id;

  try {
    await pool.query('DELETE FROM units WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting unit:', err);
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

module.exports = router;
