const express = require('express');
const router = express.Router();
const pool = require('../db');

const defaultData = {
  columns: [
    { id: 'col_node', label: 'Node' },
    { id: 'col_details', label: 'Details' },
    { id: 'col_items', label: 'Items' }
  ],
  rows: [
    { id: 'row_cronus', cells: { col_node: 'CRONUS', col_details: 'MSP DATA CHECKER | FTP SERVER | 192.168.1.150 | cronus/msp', col_items: '' } },
    { id: 'row_ares', cells: { col_node: 'ARES', col_details: 'MSP RAPID STARPRO | 192.168.1.123 | ares\\administrator', col_items: 'JK - AMBCB\nEM - BLPE\nEM - DTSST08Z\nEM - DTSST08Z1\nJK - ESSS\nLN - J112\nLN - J112FS\nLN - J112N\nEM - LEGEND\nJK - N101DTBB\nJK - N101DTXB\nJK - N110\nJK - T107C\nJK - T107W' } },
    { id: 'row_athena', cells: { col_node: 'ATHENA', col_details: 'MSP RAPID STARPRO | 192.168.1.140 | athena\\administrator', col_items: 'EM - C107I\nEM - C107O\nEM - N107I\nEM - N107O\nEM - PIONEER\nJK - SBIB\nJK - SBOB\nJK - SPPGAMK\nJK - SPPGMAY\nLN - SPPGN112\nLN - SPPGN112P2\nEM - SPPGUTS\nEM - T308CB\nEM - T308WB' } },
    { id: 'row_apollo', cells: { col_node: 'APOLLO', col_details: 'MSP RAPID STARPRO | 192.168.1.126 | apollo\\administrator', col_items: 'EM - BULLIONPK\nEM - CR102\nEM - CR102S2\nEM - CR102SL\nLN - CR116AMK\nLN - CR116EN9\nLN - CR116I\nLN - CR116424\nLN - CR116425\nLN - CR116USM\nEM - EXPOBB\nEM - EXPOXB\nLN - N106IB\nJK - N106OB\nJK - N108IB\nJK - N108OB\nJK - N1112\nJK - N1112A\nLN - T215CB\nLN - T215WB\nLN - TPWBB\nLN - TPWXP' } },
    { id: 'row_juno', cells: { col_node: 'JUNO', col_details: 'MSP RAPID STARPRO | 192.168.1.160 | juno\\administrator', col_items: 'JK - 30NCB\nJK - 30NWB\nLN - BDLV\nLN - CCKBB\nLN - CCKKP\nEM - CR103\nEM - CR103STN2\nEM - CR103STN3\nEM - DE160BB\nEM - DE160XB\nEM - GBKBB\nEM - GBKXB\nEM - IWMF\nLN - OBVCB\nLN - OBVWB' } },
    { id: 'row_icarus', cells: { col_node: 'ICARUS', col_details: 'MSP RAPID STARPRO | 192.168.1.115 | icarus\\administrator', col_items: 'EM - AM106\nLN - BRHCB\nLN - BRHWB\nEM - CR105LGTN5\nEM - CR105S10\nEM - CR105S6789\nEM - CR105SCHI\nEM - CR105SGIW\nEM - CR105SLUCP\nEM - CTE\nEM - FMBECB\nEM - FMBEWB\nEM - LIDACB P2\nEM - LIDANB P2\nEM - LIDASB P2\nEM - N101EB\nEM - N101EBECA\nEM - N101WB\nEM - PIEC' } },
    { id: 'row_orion', cells: { col_node: 'ORION', col_details: 'MSP RAPID STARPRO (MS) | 192.168.1.138 | orion\\administrator', col_items: 'MANUAL SURVEY PROJECTS\nTEST PROCESSING' } },
    { id: 'row_ceres', cells: { col_node: 'CERES', col_details: 'MSP MANAGER | 192.168.1.180', col_items: '' } },
    { id: 'row_artemis', cells: { col_node: 'ARTEMIS', col_details: 'MSP MANAGER | 192.168.1.181', col_items: '' } },
    { id: 'row_atlas', cells: { col_node: 'ATLAS', col_details: 'WEBPRO | 10.10.10.10', col_items: '' } },
    { id: 'row_alienware', cells: { col_node: 'ALIENWARE', col_details: 'GEODATA (TEMS UPLOAD) | 192.168.1.170', col_items: '' } }
  ]
};

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS data_processing_info (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function getOrCreate() {
  await ensureTable();
  const { rows } = await pool.query('SELECT id, data FROM data_processing_info ORDER BY id LIMIT 1');
  if (rows.length) return rows[0];
  const insert = await pool.query(
    'INSERT INTO data_processing_info (data) VALUES ($1) RETURNING id, data',
    [defaultData]
  );
  return insert.rows[0];
}

router.get('/', async (req, res) => {
  try {
    const row = await getOrCreate();
    res.set('Cache-Control', 'no-store');
    res.json(row.data || defaultData);
  } catch (err) {
    console.error('Failed to load data processing info:', err);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

router.put('/', async (req, res) => {
  try {
    await ensureTable();
    const payload = req.body && req.body.data ? req.body.data : null;
    if (!payload || !payload.columns) {
      return res.status(400).json({ error: 'Invalid data' });
    }
    const existing = await pool.query('SELECT id FROM data_processing_info ORDER BY id LIMIT 1');
    if (existing.rows.length) {
      await pool.query(
        'UPDATE data_processing_info SET data = $1, updated_at = NOW() WHERE id = $2',
        [payload, existing.rows[0].id]
      );
    } else {
      await pool.query('INSERT INTO data_processing_info (data) VALUES ($1)', [payload]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to save data processing info:', err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

module.exports = router;
