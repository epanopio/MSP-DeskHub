const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const pool = require('../db');

let cachedCols = null;

function quoteIdent(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

async function loadColumns() {
  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users'
  `);
  const cols = result.rows.map(r => r.column_name);
  cachedCols = {
    id: cols.includes('id') ? 'id' : cols.includes('user_id') ? 'user_id' : null,
    username: cols.includes('username') ? 'username' : cols.includes('user_name') ? 'user_name' : cols.includes('name') ? 'name' : null,
    full_name: cols.includes('full_name') ? 'full_name' : null,
    email: cols.includes('email') ? 'email'
          : cols.includes('user_email') ? 'user_email'
          : cols.includes('email_address') ? 'email_address'
          : cols.includes('mail') ? 'mail'
          : cols.includes('useremail') ? 'useremail'
          : null,
    role: cols.includes('role') ? 'role' : null,
    is_active: cols.includes('is_active') ? 'is_active' : null,
    last_login: cols.includes('last_login') ? 'last_login' : null,
    updated_on: cols.includes('updated_on') ? 'updated_on' : null,
    updated_by: cols.includes('updated_by') ? 'updated_by' : null,
    created_at: cols.includes('created_at') ? 'created_at' : null,
    password_hash: cols.includes('password_hash') ? 'password_hash' : null,
    nric_fin: cols.includes('nric_fin') ? 'nric_fin' : null,
    mobile_no: cols.includes('mobile_no') ? 'mobile_no' : null,
    address1: cols.includes('address1') ? 'address1' : null,
    address2: cols.includes('address2') ? 'address2' : null,
    address3: cols.includes('address3') ? 'address3' : null,
    birthdate: cols.includes('birthdate') ? 'birthdate' : null,
    office: cols.includes('office') ? 'office' : (cols.includes('office_location') ? 'office_location' : null),
    user_leave_total: cols.includes('user_leave_total') ? 'user_leave_total' : null,
    user_claimoff_total: cols.includes('user_claimoff_total') ? 'user_claimoff_total' : null,
    user_childcare_total: cols.includes('user_childcare_total') ? 'user_childcare_total' : null,
    user_mc_total: cols.includes('user_mc_total') ? 'user_mc_total' : null,
    user_leave_used: cols.includes('user_leave_used') ? 'user_leave_used' : null,
    user_claimoff_used: cols.includes('user_claimoff_used') ? 'user_claimoff_used' : null,
    user_childcare_used: cols.includes('user_childcare_used') ? 'user_childcare_used' : null,
    user_mc_used: cols.includes('user_mc_used') ? 'user_mc_used' : null,
    user_leave_balance: cols.includes('user_leave_balance') ? 'user_leave_balance' : null,
    user_claimoff_balance: cols.includes('user_claimoff_balance') ? 'user_claimoff_balance' : null,
    user_childcare_balance: cols.includes('user_childcare_balance') ? 'user_childcare_balance' : null,
    user_mc_balance: cols.includes('user_mc_balance') ? 'user_mc_balance' : null
  };
}

async function getCols(res) {
  if (!cachedCols) {
    try {
      await loadColumns();
    } catch (err) {
      console.error('Error reading users table columns:', err);
      if (res) res.status(500).json({ message: 'Server error reading users table.' });
      throw err;
    }
  } else if (!cachedCols.email) {
    // If schema changed (e.g., email column added) reload columns so edits work without a server restart.
    try {
      await loadColumns();
    } catch (err) {
      console.error('Error reloading users table columns:', err);
      if (res) res.status(500).json({ message: 'Server error reading users table.' });
      throw err;
    }
  }
  if (!cachedCols.id || !cachedCols.username) {
    const msg = 'Users table must have an id and username column.';
    console.error(msg, cachedCols);
    if (res) res.status(500).json({ message: msg });
    throw new Error(msg);
  }
  return cachedCols;
}

function selectFields(cols) {
  return [
    `${quoteIdent(cols.id)} AS id`,
    `${quoteIdent(cols.username)} AS username`,
    cols.full_name ? `${quoteIdent(cols.full_name)} AS full_name` : `NULL::text AS full_name`,
    cols.email ? `${quoteIdent(cols.email)} AS email` : `NULL::text AS email`,
    cols.role ? `${quoteIdent(cols.role)} AS role` : `'user'::text AS role`,
    cols.is_active ? `${quoteIdent(cols.is_active)} AS is_active` : `TRUE::boolean AS is_active`,
    cols.last_login ? `${quoteIdent(cols.last_login)} AS last_login` : `NULL::timestamp AS last_login`,
    cols.updated_on ? `${quoteIdent(cols.updated_on)} AS updated_on` : `NULL::timestamp AS updated_on`,
    cols.updated_by ? `${quoteIdent(cols.updated_by)} AS updated_by` : `NULL::text AS updated_by`,
    cols.created_at ? `${quoteIdent(cols.created_at)} AS created_at` : `NULL::timestamp AS created_at`,
    cols.nric_fin ? `${quoteIdent(cols.nric_fin)} AS nric_fin` : `NULL::text AS nric_fin`,
    cols.mobile_no ? `${quoteIdent(cols.mobile_no)} AS mobile_no` : `NULL::text AS mobile_no`,
    cols.address1 ? `${quoteIdent(cols.address1)} AS address1` : `NULL::text AS address1`,
    cols.address2 ? `${quoteIdent(cols.address2)} AS address2` : `NULL::text AS address2`,
    cols.address3 ? `${quoteIdent(cols.address3)} AS address3` : `NULL::text AS address3`,
    cols.birthdate ? `${quoteIdent(cols.birthdate)} AS birthdate` : `NULL::date AS birthdate`,
    cols.office ? `${quoteIdent(cols.office)} AS office` : `NULL::text AS office`,
    cols.user_leave_total ? `${quoteIdent(cols.user_leave_total)} AS user_leave_total` : `NULL::numeric AS user_leave_total`,
    cols.user_claimoff_total ? `${quoteIdent(cols.user_claimoff_total)} AS user_claimoff_total` : `NULL::numeric AS user_claimoff_total`,
    cols.user_childcare_total ? `${quoteIdent(cols.user_childcare_total)} AS user_childcare_total` : `NULL::numeric AS user_childcare_total`,
    cols.user_mc_total ? `${quoteIdent(cols.user_mc_total)} AS user_mc_total` : `NULL::numeric AS user_mc_total`,
    cols.user_leave_used ? `${quoteIdent(cols.user_leave_used)} AS user_leave_used` : `NULL::numeric AS user_leave_used`,
    cols.user_claimoff_used ? `${quoteIdent(cols.user_claimoff_used)} AS user_claimoff_used` : `NULL::numeric AS user_claimoff_used`,
    cols.user_childcare_used ? `${quoteIdent(cols.user_childcare_used)} AS user_childcare_used` : `NULL::numeric AS user_childcare_used`,
    cols.user_mc_used ? `${quoteIdent(cols.user_mc_used)} AS user_mc_used` : `NULL::numeric AS user_mc_used`,
    cols.user_leave_balance ? `${quoteIdent(cols.user_leave_balance)} AS user_leave_balance` : `NULL::numeric AS user_leave_balance`,
    cols.user_claimoff_balance ? `${quoteIdent(cols.user_claimoff_balance)} AS user_claimoff_balance` : `NULL::numeric AS user_claimoff_balance`,
    cols.user_childcare_balance ? `${quoteIdent(cols.user_childcare_balance)} AS user_childcare_balance` : `NULL::numeric AS user_childcare_balance`,
    cols.user_mc_balance ? `${quoteIdent(cols.user_mc_balance)} AS user_mc_balance` : `NULL::numeric AS user_mc_balance`
  ];
}

// GET all users
router.get('/', async (req, res) => {
  try {
    const cols = await getCols(res);
    const query = `SELECT ${selectFields(cols).join(', ')} FROM users ORDER BY ${quoteIdent(cols.id)} DESC`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ message: 'Server error' });
  }
});

// CREATE user
router.post('/', async (req, res) => {
  try {
    const cols = await getCols(res);
    const {
      username,
      full_name = null,
      email,
      role = 'user',
      is_active = true,
      password,
      updated_by = 'system',
      nric_fin = null,
      mobile_no = null,
      address1 = null,
      address2 = null,
      address3 = null,
      birthdate = null,
      office = null,
      user_leave_total = null,
      user_claimoff_total = null,
      user_childcare_total = null,
      user_mc_total = null,
      user_leave_used = null,
      user_claimoff_used = null,
      user_childcare_used = null,
      user_mc_used = null,
      user_leave_balance = null,
      user_claimoff_balance = null,
      user_childcare_balance = null,
      user_mc_balance = null
    } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });
    if (!cols.password_hash) return res.status(500).json({ message: 'Users table missing password_hash column.' });

    const password_hash = await bcrypt.hash(password, 10);

    const insertCols = [quoteIdent(cols.username), quoteIdent(cols.password_hash)];
    const values = [username, password_hash];
    if (cols.full_name) { insertCols.push(quoteIdent(cols.full_name)); values.push(full_name || null); }
    if (cols.email) { insertCols.push(quoteIdent(cols.email)); values.push(email || null); }
    if (cols.role) { insertCols.push(quoteIdent(cols.role)); values.push(role); }
    if (cols.is_active) { insertCols.push(quoteIdent(cols.is_active)); values.push(is_active); }
    if (cols.updated_by) { insertCols.push(quoteIdent(cols.updated_by)); values.push(updated_by); }
    if (cols.nric_fin) { insertCols.push(quoteIdent(cols.nric_fin)); values.push(nric_fin); }
    if (cols.mobile_no) { insertCols.push(quoteIdent(cols.mobile_no)); values.push(mobile_no); }
    if (cols.address1) { insertCols.push(quoteIdent(cols.address1)); values.push(address1); }
    if (cols.address2) { insertCols.push(quoteIdent(cols.address2)); values.push(address2); }
    if (cols.address3) { insertCols.push(quoteIdent(cols.address3)); values.push(address3); }
    if (cols.birthdate) { insertCols.push(quoteIdent(cols.birthdate)); values.push(birthdate); }
    if (cols.office) { insertCols.push(quoteIdent(cols.office)); values.push(office); }
    if (cols.user_leave_total) { insertCols.push(quoteIdent(cols.user_leave_total)); values.push(user_leave_total); }
    if (cols.user_claimoff_total) { insertCols.push(quoteIdent(cols.user_claimoff_total)); values.push(user_claimoff_total); }
    if (cols.user_childcare_total) { insertCols.push(quoteIdent(cols.user_childcare_total)); values.push(user_childcare_total); }
    if (cols.user_mc_total) { insertCols.push(quoteIdent(cols.user_mc_total)); values.push(user_mc_total); }
    if (cols.user_leave_used) { insertCols.push(quoteIdent(cols.user_leave_used)); values.push(user_leave_used); }
    if (cols.user_claimoff_used) { insertCols.push(quoteIdent(cols.user_claimoff_used)); values.push(user_claimoff_used); }
    if (cols.user_childcare_used) { insertCols.push(quoteIdent(cols.user_childcare_used)); values.push(user_childcare_used); }
    if (cols.user_mc_used) { insertCols.push(quoteIdent(cols.user_mc_used)); values.push(user_mc_used); }
    if (cols.user_leave_balance) { insertCols.push(quoteIdent(cols.user_leave_balance)); values.push(user_leave_balance); }
    if (cols.user_claimoff_balance) { insertCols.push(quoteIdent(cols.user_claimoff_balance)); values.push(user_claimoff_balance); }
    if (cols.user_childcare_balance) { insertCols.push(quoteIdent(cols.user_childcare_balance)); values.push(user_childcare_balance); }
    if (cols.user_mc_balance) { insertCols.push(quoteIdent(cols.user_mc_balance)); values.push(user_mc_balance); }

    const placeholders = values.map((_, idx) => `$${idx + 1}`);
    const query = `
      INSERT INTO users (${insertCols.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING ${selectFields(cols).join(', ')}
    `;
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE user (not password)
router.put('/:id', async (req, res) => {
  try {
    const cols = await getCols(res);
    const { id } = req.params;
  const {
      username,
      full_name = null,
      email,
      role = 'user',
      is_active = true,
      updated_by = 'system',
      nric_fin = null,
      mobile_no = null,
      address1 = null,
      address2 = null,
      address3 = null,
      birthdate = null,
      office = null,
      user_leave_total = null,
      user_claimoff_total = null,
      user_childcare_total = null,
      user_mc_total = null,
      user_leave_used = null,
      user_claimoff_used = null,
      user_childcare_used = null,
      user_mc_used = null,
      user_leave_balance = null,
      user_claimoff_balance = null,
      user_childcare_balance = null,
      user_mc_balance = null
    } = req.body;
    if (!username) return res.status(400).json({ message: 'Username is required.' });

    const sets = [`${quoteIdent(cols.username)} = $1`];
    const values = [username];
    if (cols.full_name) { sets.push(`${quoteIdent(cols.full_name)} = $${values.length + 1}`); values.push(full_name || null); }

    if (cols.email) { sets.push(`${quoteIdent(cols.email)} = $${values.length + 1}`); values.push(email || null); }
    if (cols.role) { sets.push(`${quoteIdent(cols.role)} = $${values.length + 1}`); values.push(role); }
    if (cols.is_active) { sets.push(`${quoteIdent(cols.is_active)} = $${values.length + 1}`); values.push(is_active); }
    if (cols.updated_by) { sets.push(`${quoteIdent(cols.updated_by)} = $${values.length + 1}`); values.push(updated_by); }
    if (cols.nric_fin) { sets.push(`${quoteIdent(cols.nric_fin)} = $${values.length + 1}`); values.push(nric_fin); }
    if (cols.mobile_no) { sets.push(`${quoteIdent(cols.mobile_no)} = $${values.length + 1}`); values.push(mobile_no); }
    if (cols.address1) { sets.push(`${quoteIdent(cols.address1)} = $${values.length + 1}`); values.push(address1); }
    if (cols.address2) { sets.push(`${quoteIdent(cols.address2)} = $${values.length + 1}`); values.push(address2); }
    if (cols.address3) { sets.push(`${quoteIdent(cols.address3)} = $${values.length + 1}`); values.push(address3); }
    if (cols.birthdate) { sets.push(`${quoteIdent(cols.birthdate)} = $${values.length + 1}`); values.push(birthdate); }
    if (cols.office) { sets.push(`${quoteIdent(cols.office)} = $${values.length + 1}`); values.push(office); }
    if (cols.user_leave_total) { sets.push(`${quoteIdent(cols.user_leave_total)} = $${values.length + 1}`); values.push(user_leave_total); }
    if (cols.user_claimoff_total) { sets.push(`${quoteIdent(cols.user_claimoff_total)} = $${values.length + 1}`); values.push(user_claimoff_total); }
    if (cols.user_childcare_total) { sets.push(`${quoteIdent(cols.user_childcare_total)} = $${values.length + 1}`); values.push(user_childcare_total); }
    if (cols.user_mc_total) { sets.push(`${quoteIdent(cols.user_mc_total)} = $${values.length + 1}`); values.push(user_mc_total); }
    if (cols.user_leave_used) { sets.push(`${quoteIdent(cols.user_leave_used)} = $${values.length + 1}`); values.push(user_leave_used); }
    if (cols.user_claimoff_used) { sets.push(`${quoteIdent(cols.user_claimoff_used)} = $${values.length + 1}`); values.push(user_claimoff_used); }
    if (cols.user_childcare_used) { sets.push(`${quoteIdent(cols.user_childcare_used)} = $${values.length + 1}`); values.push(user_childcare_used); }
    if (cols.user_mc_used) { sets.push(`${quoteIdent(cols.user_mc_used)} = $${values.length + 1}`); values.push(user_mc_used); }
    if (cols.user_leave_balance) { sets.push(`${quoteIdent(cols.user_leave_balance)} = $${values.length + 1}`); values.push(user_leave_balance); }
    if (cols.user_claimoff_balance) { sets.push(`${quoteIdent(cols.user_claimoff_balance)} = $${values.length + 1}`); values.push(user_claimoff_balance); }
    if (cols.user_childcare_balance) { sets.push(`${quoteIdent(cols.user_childcare_balance)} = $${values.length + 1}`); values.push(user_childcare_balance); }
    if (cols.user_mc_balance) { sets.push(`${quoteIdent(cols.user_mc_balance)} = $${values.length + 1}`); values.push(user_mc_balance); }
    if (cols.updated_on) { sets.push(`${quoteIdent(cols.updated_on)} = CURRENT_TIMESTAMP`); }

    values.push(id);
    const query = `
      UPDATE users
      SET ${sets.join(', ')}
      WHERE ${quoteIdent(cols.id)} = $${values.length}
      RETURNING ${selectFields(cols).join(', ')}
    `;
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Server error' });
  }
});

// RESET/SET password
router.put('/:id/password', async (req, res) => {
  try {
    const cols = await getCols(res);
    const { id } = req.params;
    const { password, updated_by = 'system' } = req.body;
    if (!password) return res.status(400).json({ message: 'Password is required.' });
    if (!cols.password_hash) return res.status(500).json({ message: 'Users table missing password_hash column.' });

    const password_hash = await bcrypt.hash(password, 10);
    const sets = [`${quoteIdent(cols.password_hash)} = $1`];
    const values = [password_hash];
    if (cols.updated_by) { sets.push(`${quoteIdent(cols.updated_by)} = $${values.length + 1}`); values.push(updated_by); }
    if (cols.updated_on) { sets.push(`${quoteIdent(cols.updated_on)} = CURRENT_TIMESTAMP`); }
    values.push(id);

    const query = `
      UPDATE users
      SET ${sets.join(', ')}
      WHERE ${quoteIdent(cols.id)} = $${values.length}
    `;
    await pool.query(query, values);
    res.json({ message: 'Password updated.' });
  } catch (err) {
    console.error('Error updating password:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Server error' });
  }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  try {
    const cols = await getCols(res);
    await pool.query(`DELETE FROM users WHERE ${quoteIdent(cols.id)} = $1`, [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting user:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
