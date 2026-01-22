require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { PassThrough } = require('stream');
const fs = require('fs');
const bcrypt = require('bcrypt');
const pool = require('./db');
const calendarFile = path.join(__dirname, 'calendar-events.json');

function ensureCalendarFile() {
  if (!fs.existsSync(calendarFile)) {
    const initial = { operations: [], reports: [], leave: [] };
    fs.writeFileSync(calendarFile, JSON.stringify(initial, null, 2));
  }
}

function loadCalendar() {
  ensureCalendarFile();
  try {
    const raw = fs.readFileSync(calendarFile, 'utf8');
    const json = JSON.parse(raw || '{}');
    return {
      operations: json.operations || [],
      reports: json.reports || [],
      leave: json.leave || []
    };
  } catch (err) {
    console.error('Failed to load calendar file, resetting.', err);
    const initial = { operations: [], reports: [], leave: [] };
    fs.writeFileSync(calendarFile, JSON.stringify(initial, null, 2));
    return initial;
  }
}

function saveCalendar(data) {
  fs.writeFileSync(calendarFile, JSON.stringify(data, null, 2));
}

function normalizeCalType(t) {
  const key = (t || '').toString().toLowerCase();
  if (key.includes('report')) return 'reports';
  if (key.includes('leave')) return 'leave';
  return 'operations';
}

const calendarConfigs = {
  operations: {
    table: 'operations_calendar',
    cols: {
      title: 'calendarops_event',
      time: 'calendarops_time',
      remarks: 'calendarops_remarks',
      from: 'calendarops_eventfrom',
      to: 'calendarops_eventto',
      color: 'calendarops_color'
    }
  },
  reports: {
    table: 'reports_calendar',
    cols: {
      title: 'calendarreports_event',
      time: 'calendarreports_time',
      remarks: 'calendarreports_remarks',
      from: 'calendarreports_eventfrom',
      to: 'calendarreports_eventto',
      color: 'calendarreports_color',
      repeat: 'calendarreports_repeat'
    }
  },
  leave: {
    table: 'leave_calendar',
    cols: {
      title: 'calendarleave_event',
      time: 'calendarleave_time',
      remarks: 'calendarleave_remarks',
      from: 'calendarleave_eventfrom',
      to: 'calendarleave_eventto',
      color: 'calendarleave_color'
    }
  }
};

let calendarTablesReady = false;

async function ensureCalendarTables() {
  if (calendarTablesReady) return;
  for (const key of Object.keys(calendarConfigs)) {
    const cfg = calendarConfigs[key];
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${cfg.table} (
        id SERIAL PRIMARY KEY,
        event_date DATE NOT NULL,
        ${cfg.cols.title} TEXT NOT NULL,
        ${cfg.cols.time} TEXT,
        ${cfg.cols.remarks} TEXT,
        ${cfg.cols.from} DATE,
        ${cfg.cols.to} DATE,
        ${cfg.cols.color} TEXT
        ${cfg.cols.repeat ? `, ${cfg.cols.repeat} TEXT` : ''}
        , created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE ${cfg.table} ADD COLUMN IF NOT EXISTS ${cfg.cols.from} DATE;
      ALTER TABLE ${cfg.table} ADD COLUMN IF NOT EXISTS ${cfg.cols.to} DATE;
      ALTER TABLE ${cfg.table} ADD COLUMN IF NOT EXISTS ${cfg.cols.color} TEXT;
      ${cfg.cols.repeat ? `ALTER TABLE ${cfg.table} ADD COLUMN IF NOT EXISTS ${cfg.cols.repeat} TEXT;` : ''}
      CREATE INDEX IF NOT EXISTS idx_${cfg.table}_event_date ON ${cfg.table} (event_date);
    `);
  }
  calendarTablesReady = true;
}

function normalizeDateVal(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = val.toString();
  // if it already looks like YYYY-MM-DD, keep it as-is
  const match = s.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : (s ? s.substring(0, 10) : null);
}

function calendarRowToEvent(type, cfg, row) {
  const time = row.time || '';
  const remarks = row.remarks || '';
  const color = row.color || '';
  const repeat = row.repeat || '';
  const fromDate = normalizeDateVal(row.event_from || row.event_date);
  const toDate = normalizeDateVal(row.event_to || row.event_date);
  const start = fromDate ? (time ? `${fromDate}T${time}` : fromDate) : null;
  let end = null;
  if (toDate) {
    if (time) {
      end = `${toDate}T${time}`;
    } else {
      // FullCalendar treats all-day end as exclusive, so add one day for multi-day ranges
      const toParts = toDate.split('-').map(Number);
      const dt = new Date(Date.UTC(toParts[0], toParts[1] - 1, toParts[2]));
      dt.setUTCDate(dt.getUTCDate() + 1);
      const y = dt.getUTCFullYear();
      const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dt.getUTCDate()).padStart(2, '0');
      end = `${y}-${m}-${d}`;
    }
  } else if (start) {
    end = start;
  }
  return {
    id: row.id,
    title: row.title || 'Event',
    start,
    end,
    allDay: !time,
    time,
    remarks,
    eventFrom: fromDate,
    eventTo: toDate,
    color,
    repeat,
    type
  };
}

// Routers for CRUD endpoints
const itemsRouter = require('./routes/items');
const modelsRouter = require('./routes/models');
const unitsRouter = require('./routes/units');
const usersRouter = require('./routes/users');
const projectsRouter = require('./routes/projects');
const inventoryInoutRouter = require('./routes/inventoryInout');

let userTableCols = null;
let formTableReady = false;

function quoteIdent(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

async function loadUserCols() {
  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users'
  `);
  const cols = result.rows.map(r => r.column_name);
  userTableCols = {
    id: cols.includes('id') ? 'id' : cols.includes('user_id') ? 'user_id' : null,
    username: cols.includes('username') ? 'username' : cols.includes('user_name') ? 'user_name' : cols.includes('name') ? 'name' : null,
    full_name: cols.includes('full_name') ? 'full_name' : null,
    password_hash: cols.includes('password_hash') ? 'password_hash' : null,
    role: cols.includes('role') ? 'role' : null,
    allowed_apps: cols.includes('allowed_apps') ? 'allowed_apps' : null
  };
}

async function ensureFormRecordsTable() {
  if (formTableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS form_records (
      id SERIAL PRIMARY KEY,
      username TEXT,
      full_name TEXT,
      control_number TEXT,
      form_type TEXT NOT NULL,
      submitted_on TIMESTAMPTZ DEFAULT NOW(),
      status TEXT DEFAULT 'Submitted',
      payload JSONB DEFAULT '{}'::jsonb
    );
    ALTER TABLE form_records ADD COLUMN IF NOT EXISTS full_name TEXT;
    ALTER TABLE form_records ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE form_records ADD COLUMN IF NOT EXISTS control_number TEXT;
    ALTER TABLE form_records ADD COLUMN IF NOT EXISTS submitted_on TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE form_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Submitted';
    ALTER TABLE form_records ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_form_records_user ON form_records (lower(username));
    CREATE INDEX IF NOT EXISTS idx_form_records_type ON form_records (form_type);
    CREATE INDEX IF NOT EXISTS idx_form_records_control ON form_records (control_number);
  `);
  formTableReady = true;
}

function formTypeCode(formType) {
  const key = (formType || '').toString().toLowerCase();
  if (key === 'night_access') return 'NAF';
  if (key === 'leave') return 'LVF';
  if (key === 'overtime') return 'OTF';
  if (key === 'time_off') return 'TOF';
  if (key === 'mc_form') return 'MCF';
  return 'FM';
}

async function generateControlNumber(formType, username) {
  const uname = (username || '').trim();
  if (!uname) return '';
  await ensureFormRecordsTable();
  const code = formTypeCode(formType);
  const { rows } = await pool.query(
    `SELECT control_number
     FROM form_records
     WHERE lower(username) = lower($1)
       AND form_type = $2
       AND control_number IS NOT NULL`,
    [uname, formType || 'form']
  );
  let maxSeq = 0;
  const prefix = `${code}_${uname}_`.toLowerCase();
  rows.forEach(row => {
    const cn = (row.control_number || '').toString().toLowerCase();
    if (cn.startsWith(prefix)) {
      const tail = cn.slice(prefix.length);
      const n = parseInt(tail, 10);
      if (!Number.isNaN(n)) maxSeq = Math.max(maxSeq, n);
    }
  });
  const next = maxSeq + 1;
  const seq = String(next).padStart(3, '0');
  return `${code}_${uname}_${seq}`;
}

async function saveFormRecord(body, formType, controlNumber) {
  try {
    await ensureFormRecordsTable();
    const username = (body.username || body.user || '').trim() || null;
    const fullName = body.full_name || body.fullName || null;
    const submittedOn = body.submitted_on || body.submittedOn || null;
    const status = body.status || 'Submitted';
    const payload = body || {};
    console.log('Saving form record', { username, formType, submittedOn });
    await pool.query(
      `INSERT INTO form_records (username, full_name, control_number, form_type, submitted_on, status, payload)
       VALUES ($1,$2,$3,$4,COALESCE($5, NOW()),$6,$7)`,
      [username, fullName, controlNumber || null, formType || 'form', submittedOn, status, payload]
    );
    console.log('Form record saved');
  } catch (err) {
    console.error('Failed to save form record:', err);
  }
}

const app = express();
const PORT = process.env.PORT || 4051;

app.use(cors());
app.use(bodyParser.json());
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});
app.use(express.static(path.join(__dirname, '..')));

// Register API routers so pages (items/models/units) can fetch data
app.use('/api/items', itemsRouter);
app.use('/api/models', modelsRouter);
app.use('/api/units', unitsRouter);
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/inventory-inout', inventoryInoutRouter);

// Forms records endpoints (used by formsrecords.html)
app.get('/api/forms/records', async (req, res) => {
  try {
    await ensureFormRecordsTable();
    const user = (req.query.user || '').trim();
    if (user) {
      const { rows } = await pool.query(
        `SELECT id, username, full_name, control_number, form_type AS "formType", submitted_on, status, payload
         FROM form_records
         WHERE lower(username) = lower($1)
         ORDER BY submitted_on DESC`,
        [user]
      );
      return res.json(rows);
    }
    const { rows } = await pool.query(
      `SELECT id, username, full_name, control_number, form_type AS "formType", submitted_on, status, payload
       FROM form_records
       ORDER BY submitted_on DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching form records:', err);
    res.status(500).json({ error: 'Failed to load records' });
  }
});

app.post('/api/forms/records', async (req, res) => {
  try {
    await ensureFormRecordsTable();
    const body = req.body || {};
    const username = (body.username || body.user || '').trim();
    const fullName = body.full_name || body.fullName || null;
    const controlNumber = body.control_number || body.controlNumber || null;
    const formType = body.formType || 'form';
    const status = body.status || 'Submitted';
    const submittedOn = body.submitted_on || body.submittedOn || null;
    const payload = body.payload || body || {};
    if (!username) return res.status(400).json({ error: 'username required' });
    const { rows } = await pool.query(
      `INSERT INTO form_records (username, full_name, control_number, form_type, submitted_on, status, payload)
       VALUES ($1,$2,$3,$4,COALESCE($5, NOW()),$6,$7)
       RETURNING id, control_number, form_type AS "formType", submitted_on, status`,
      [username, fullName, controlNumber, formType, submittedOn, status, payload]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Error saving form record:', err);
    res.status(500).json({ error: 'Failed to save record' });
  }
});

// Helper: generate a formatted PDF similar to the Leave form layout
async function createFormPdf(formTitle, fieldsList, opts = {}) {
  const officeRaw = (opts.office || '').toString().toLowerCase();
  const isKL = officeRaw.includes('kuala') || officeRaw.includes('kl');
  // Larger margin and taller content box for longer border and signature space
  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const mspLogoFile = isKL
    ? path.join(__dirname, '..', 'assets', 'images', 'MSP_Logo-my.png')
    : path.join(__dirname, '..', 'assets', 'images', 'MSP_Logo-00.png');
  const deskHubLogoFile = path.join(__dirname, '..', 'assets', 'images', 'deskhub.png');

  if (fs.existsSync(mspLogoFile)) doc.image(mspLogoFile, 40, 2, { width: 140, height: 80 });
  if (fs.existsSync(deskHubLogoFile)) doc.image(deskHubLogoFile, pageWidth - 40 - 113, 20, { width: 113, height: 28 });

  // Header text
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .text(isKL ? 'Monitoring Solution Providers Sdn. Bhd.' : 'MONITORING SOLUTION PROVIDERS PTE LTD', 0, 75, { align: 'center' })
    .font('Helvetica')
    .fontSize(9);

  if (isKL) {
    doc
      .text('215 Level 6 & 7 , Residence Tribeca , Jalan Imbi , 55100 Kuala Lumpur, Federal Territory of Kuala Lumpur', { align: 'center' })
      .text('Room Number : 766', { align: 'center' });
  } else {
    doc
      .text('33 Ubi Ave 3, Vertex #05-31 Tower B, Singapore 408868', { align: 'center' })
      .text('Office : +65 6747 9766  |  Fax : +65 6458 0824  |  Website: www.mspsystem.com', { align: 'center' });
  }

  doc
    .moveDown(1);

  // Title
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .text(formTitle.toUpperCase(), { align: 'center', underline: true })
    .moveDown(1.2);

  // Details box (taller for longer border)
  const boxX = 40;
  const boxY = doc.y;
  const boxW = doc.page.width - boxX * 2;
  const boxH = 260;
  doc.rect(boxX, boxY, boxW, boxH).stroke();

  const labelX = boxX + 15;
  const valueX = boxX + 170;
  const valueWidth = boxX + boxW - valueX - 10;
  const monthsShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formatDateToken = (y, m, d) => {
    const mi = parseInt(m, 10) - 1;
    if (Number.isNaN(mi) || mi < 0 || mi > 11) return `${y}-${m}-${d}`;
    return `${y}-${monthsShort[mi]}-${d}`;
  };
  const formatDateText = (text) => {
    if (!text) return '';
    let out = String(text);
    out = out.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_m, y, m, d) => formatDateToken(y, m, d));
    out = out.replace(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g, (_m, mm, dd, yyyy) => formatDateToken(yyyy, mm, dd));
    return out;
  };
  let y2 = boxY + 14;

  (fieldsList || []).forEach(item => {
    const label = item.label || '';
    const valueText = `: ${formatDateText(item.value || 'N/A')}`;
    doc.font('Helvetica-Bold').fontSize(10).text(label, labelX, y2);
    doc.font('Helvetica').fontSize(10).text(valueText, valueX, y2, { width: valueWidth });
    const valueHeight = doc.heightOfString(valueText, { width: valueWidth });
    y2 += Math.max(20, valueHeight + 4);
  });

  // Signature lines (lower to leave space)
  doc.y = boxY + boxH + 80;
  const sigY = doc.y + 12;
  const sigW = (doc.page.width - 100) / 2;
  const sig1X = 50;
  const sig2X = sig1X + sigW + 20;
  doc.moveTo(sig1X, sigY).lineTo(sig1X + sigW - 20, sigY).stroke();
  doc.font('Helvetica').fontSize(10).text('Employee Signature', sig1X, sigY + 5);
  doc.moveTo(sig2X, sigY).lineTo(sig2X + sigW - 20, sigY).stroke();
  doc.font('Helvetica').fontSize(10).text('Approved By', sig2X, sigY + 5);

  // Footer anchored near bottom of page 1
  const footerText = 'Generated by Monitoring Solution Providers Pte. Ltd.\n(DeskHub Portal)';
  const footerY = doc.page.height - 70;
  doc.font('Helvetica').fontSize(9).fillColor('gray').text(footerText, 0, footerY, { align: 'center', width: pageWidth });

  doc.end();

  const buffer = await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

  return buffer;
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!userTableCols) await loadUserCols();
    if (!userTableCols || !userTableCols.username || !userTableCols.password_hash) {
      return res.status(500).json({ message: "Users table missing required columns." });
    }
    const unameCol = quoteIdent(userTableCols.username);
    const passCol = quoteIdent(userTableCols.password_hash);
    const fullNameCol = userTableCols.full_name ? quoteIdent(userTableCols.full_name) : null;
    const roleCol = userTableCols.role ? quoteIdent(userTableCols.role) : null;
    const appsCol = userTableCols.allowed_apps ? quoteIdent(userTableCols.allowed_apps) : null;

    const selectParts = [
      `${unameCol} AS username`,
      `${passCol} AS password_hash`
    ];
    if (fullNameCol) selectParts.push(`${fullNameCol} AS full_name`);
    if (roleCol) selectParts.push(`${roleCol} AS role`);
    if (appsCol) selectParts.push(`${appsCol} AS allowed_apps`);

    const query = `SELECT ${selectParts.join(', ')} FROM users WHERE ${unameCol} = $1 LIMIT 1`;
    const result = await pool.query(query, [username]);
    if (result.rows.length === 0) return res.status(401).json({ message: "Invalid username or password." });
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Invalid username or password." });

    const role = (user.role || '').toLowerCase() || 'user';
    const defaultByRole = {
      superadmin: ['dashboard', 'inventory', 'controlpanel', 'adminforms', 'leaveform', 'userprofile', 'projects'],
      admin: ['dashboard', 'inventory', 'adminforms', 'leaveform', 'userprofile', 'projects'],
      user: ['dashboard', 'adminforms', 'leaveform', 'userprofile', 'projects']
    };
    const defaultApps = defaultByRole[role] || defaultByRole.user;
    let allowed_apps = Array.isArray(user.allowed_apps) && user.allowed_apps.length
      ? Array.from(new Set([...(user.allowed_apps || []), ...defaultApps]))
      : defaultApps;
    // Always include dashboard access
    if (!allowed_apps.includes('dashboard')) allowed_apps = ['dashboard', ...allowed_apps];

    res.status(200).json({
      message: "Login successful.",
      role,
      allowed_apps,
      username: user.username,
      full_name: user.full_name || user.username
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

app.get('/api/send-leave-pdf', (req, res) => {
  // Informative response for browser GETs (avoids default "Cannot GET" page)
  return res.status(405).json({ message: 'This endpoint accepts POST requests only. Submit the leave form to POST JSON to /api/send-leave-pdf.' });
});

// Simple logout endpoint (client-side also clears localStorage)
app.post('/logout', (req, res) => {
  // If you add server-side sessions later, clear them here
  return res.status(200).json({ message: 'Logged out' });
});

app.post('/api/send-leave-pdf', async (req, res) => {
  console.log('POST /api/send-leave-pdf received');
  const formType = req.body && req.body.formType;
  const recipient = process.env.EMAIL_TO;

  async function resolveOfficeFallback() {
    try {
      const username = (req.body.username || '').trim().toLowerCase();
      if (!username) return null;
      const { rows } = await pool.query('SELECT office FROM users WHERE lower(username)= $1 LIMIT 1', [username]);
      if (rows.length && rows[0].office) return rows[0].office;
    } catch (err) {
      console.warn('Could not resolve office from DB', err.message || err);
    }
    return null;
  }

  try {
    // Map formType to title and subject
    const titles = {
      night_access: 'Night Access Form',
      time_off: 'Time Off Form',
      mc_form: 'MC Form',
      overtime: 'Overtime Form',
      leave: 'Leave Application Form'
    };
    const title = titles[formType] || titles.leave;
    const subjectName =
      req.body.full_name ||
      req.body.fullName ||
      req.body.username ||
      '';
    const usernameForControl = req.body.username || '';
    const controlNumber = await generateControlNumber(formType, usernameForControl);
    const subject = `DeskHub ${title}${subjectName ? ' : ' + subjectName : ''}${controlNumber ? ' - ' + controlNumber : ''}`;
    const userEmail = req.body.userEmail || req.body.email || null;
    const office = req.body.office || await resolveOfficeFallback() || '';

    // Build fields array for PDF
    let fieldsList = [];
    const submitDate = req.body.submitted_on || req.body.submittedOn || '';
    const fullName = req.body.full_name || req.body.fullName || '';
    // Render checkbox-like values
    const cb = (checked) => (checked ? '[✔]' : '[ ]');

    if (formType === 'night_access') {
      fieldsList = [
        { label: 'Control Number', value: controlNumber },
        { label: 'Full Name', value: fullName },
        { label: 'Submitted On', value: submitDate },
        { label: 'Project', value: req.body.project || '' },
        { label: 'Location', value: req.body.location || '' },
        { label: 'Station', value: req.body.station || '' },
        { label: 'Bound', value: req.body.bound || '' },
        { label: 'Task', value: req.body.task || '' },
        { label: 'Access Date From', value: `${req.body.from_date || ''}   ${cb(req.body.from_am)} AM   ${cb(req.body.from_pm)} PM` },
        { label: 'Night Access To', value: `${req.body.to_date || ''}   ${cb(req.body.to_am)} AM   ${cb(req.body.to_pm)} PM` },
        { label: 'Remarks', value: req.body.remarks || '' }
      ];
    } else if (formType === 'time_off') {
      fieldsList = [
        { label: 'Control Number', value: controlNumber },
        { label: 'Full Name', value: fullName },
        { label: 'Submitted On', value: submitDate },
        { label: 'Date', value: `${req.body.date || ''}   ${cb(req.body.am)} AM   ${cb(req.body.pm)} PM` },
        { label: 'Time Off', value: req.body.time_off || '' },
        { label: 'Remarks', value: req.body.remarks || '' }
      ];
    } else if (formType === 'mc_form') {
      fieldsList = [
        { label: 'Control Number', value: controlNumber },
        { label: 'Full Name', value: fullName },
        { label: 'Submitted On', value: submitDate },
        { label: 'From Date', value: `${req.body.from_date || ''}   ${cb(req.body.from_am)} AM   ${cb(req.body.from_pm)} PM` },
        { label: 'To Date', value: `${req.body.to_date || ''}   ${cb(req.body.to_am)} AM   ${cb(req.body.to_pm)} PM` },
        { label: 'Remarks', value: req.body.remarks || '' }
      ];
    } else if (formType === 'overtime') {
      fieldsList = [
        { label: 'Control Number', value: controlNumber },
        { label: 'Full Name', value: fullName },
        { label: 'Submitted On', value: submitDate },
        { label: 'Overtime Date', value: req.body.overtime_date || '' },
        { label: 'Time From', value: req.body.time_from || '' },
        { label: 'Time To', value: req.body.time_to || '' },
        { label: 'Total Hours', value: req.body.total_hours || '' },
        { label: 'Remarks', value: req.body.remarks || '' }
      ];
    } else {
      const ranges = Array.isArray(req.body.leaveDateRanges) ? req.body.leaveDateRanges : [];
      const rangeLines = ranges
        .map(r => `${(r.start || '').trim()} to ${(r.end || '').trim()}`.trim())
        .filter(Boolean);
      const combinedRanges = rangeLines.length ? rangeLines.join('\n') : '';
      fieldsList = [
        { label: 'Control Number', value: controlNumber },
        { label: 'Full Name', value: fullName },
        { label: 'Leave Type', value: req.body.leaveType || '' },
        { label: 'Submitted On', value: submitDate || req.body.submittedOn || req.body.submitted_on || '' },
        { label: 'From Date', value: combinedRanges || req.body.fromDate || '' },
        { label: 'Number of Days', value: req.body.leavenumberdays || '' },
        { label: 'Remarks', value: req.body.leaveremarks || '' }
      ];
    }

    const pdfBuffer = await createFormPdf(title, fieldsList, { office });

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: { rejectUnauthorized: false }
    });

    const safe = (s) => (s || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const filenameSafe = controlNumber
      ? safe(controlNumber)
      : (() => {
          const baseName = formType === 'leave' ? 'leave_form' : title.toLowerCase();
          const filenameParts = [baseName];
          if (fullName) filenameParts.push(fullName);
          if (submitDate) filenameParts.push(submitDate);
          return filenameParts.map(safe).filter(Boolean).join('_') || title.toLowerCase().replace(/\s+/g, '_');
        })();

    const recipients = [process.env.EMAIL_TO].filter(Boolean);
    if (userEmail) recipients.push(userEmail);

    await transporter.sendMail({
      from: `"DeskHub" <${process.env.EMAIL_USER}>`,
      to: recipients.join(','),
      subject,
      text: `Please find attached the ${title}.`,
      attachments: [
        { filename: `${filenameSafe}.pdf`, content: pdfBuffer }
      ]
    });

    // persist a record for the Forms Records page
    await saveFormRecord({ ...(req.body || {}), control_number: controlNumber }, formType, controlNumber);

    res.status(200).json({ message: 'Email sent successfully!' });

  } catch (error) {
    console.error('Error generating/sending PDF:');
    console.error(error && error.stack ? error.stack : error);
    res.status(500).json({ message: 'Failed to send email.', error: (error && error.message) || String(error) });
  }
});

// Calendar APIs (database storage)
app.get('/api/calendar/:type', async (req, res) => {
  try {
    const type = normalizeCalType(req.params.type);
    const cfg = calendarConfigs[type];
    await ensureCalendarTables();
    const selectRepeat = cfg.cols.repeat ? `, ${cfg.cols.repeat} AS repeat` : '';
    const { rows } = await pool.query(
      `SELECT id,
              event_date,
              ${cfg.cols.from} AS event_from,
              ${cfg.cols.to} AS event_to,
              ${cfg.cols.title} AS title,
              ${cfg.cols.time} AS time,
              ${cfg.cols.remarks} AS remarks,
              ${cfg.cols.color} AS color
              ${selectRepeat}
       FROM ${cfg.table}
       ORDER BY event_date, id`
    );
    res.set('Cache-Control', 'no-store');
    res.json(rows.map(r => calendarRowToEvent(type, cfg, r)));
  } catch (err) {
    console.error('Failed to load calendar events', err);
    res.status(500).json({ message: 'Failed to load events' });
  }
});

app.patch('/api/forms/records/:id', async (req, res) => {
  try {
    await ensureFormRecordsTable();
    const id = req.params.id;
    const status = (req.body && req.body.status) ? String(req.body.status) : '';
    if (!status) return res.status(400).json({ error: 'status required' });
    const { rows } = await pool.query(
      `UPDATE form_records
       SET status = $1
       WHERE id = $2
       RETURNING id, status`,
      [status, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating form record status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.post('/api/forms/records/:id/send-status-email', async (req, res) => {
  try {
    await ensureFormRecordsTable();
    const id = req.params.id;
    const { rows } = await pool.query(
      `SELECT id, status, control_number, form_type AS "formType", username, full_name, submitted_on, payload
       FROM form_records
       WHERE id = $1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });

    const record = rows[0];
    const payload = record.payload || {};
    const office = payload.office || '';
    const fullName = record.full_name || payload.full_name || payload.fullName || record.username || '';
    const submittedOn = record.submitted_on ? String(record.submitted_on).split('T')[0] : '';
    const formType = record.formType || payload.formType || 'form';
    const controlNumber = record.control_number || payload.control_number || '';
    const statusText = record.status || 'Submitted';

    const titles = {
      night_access: 'Night Access Form',
      time_off: 'Time Off Form',
      mc_form: 'MC Form',
      overtime: 'Overtime Form',
      leave: 'Leave Application Form'
    };
    const title = titles[formType] || titles.leave;

    let fieldsList = [];
    const cb = (checked) => (checked ? '[バ"]' : '[ ]');

    if (formType === 'night_access') {
      fieldsList = [
        { label: 'Control Number', value: controlNumber },
        { label: 'Status', value: statusText },
        { label: 'Full Name', value: fullName },
        { label: 'Submitted On', value: submittedOn },
        { label: 'Project', value: payload.project || '' },
        { label: 'Location', value: payload.location || '' },
        { label: 'Station', value: payload.station || '' },
        { label: 'Bound', value: payload.bound || '' },
        { label: 'Task', value: payload.task || '' },
        { label: 'Access Date From', value: `${payload.from_date || ''}   ${cb(payload.from_am)} AM   ${cb(payload.from_pm)} PM` },
        { label: 'Night Access To', value: `${payload.to_date || ''}   ${cb(payload.to_am)} AM   ${cb(payload.to_pm)} PM` },
        { label: 'Remarks', value: payload.remarks || '' }
      ];
    } else if (formType === 'time_off') {
      fieldsList = [
        { label: 'Control Number', value: controlNumber },
        { label: 'Status', value: statusText },
        { label: 'Full Name', value: fullName },
        { label: 'Submitted On', value: submittedOn },
        { label: 'Date', value: `${payload.date || ''}   ${cb(payload.am)} AM   ${cb(payload.pm)} PM` },
        { label: 'Time Off', value: payload.time_off || '' },
        { label: 'Remarks', value: payload.remarks || '' }
      ];
    } else if (formType === 'mc_form') {
      fieldsList = [
        { label: 'Control Number', value: controlNumber },
        { label: 'Status', value: statusText },
        { label: 'Full Name', value: fullName },
        { label: 'Submitted On', value: submittedOn },
        { label: 'From Date', value: `${payload.from_date || ''}   ${cb(payload.from_am)} AM   ${cb(payload.from_pm)} PM` },
        { label: 'To Date', value: `${payload.to_date || ''}   ${cb(payload.to_am)} AM   ${cb(payload.to_pm)} PM` },
        { label: 'Remarks', value: payload.remarks || '' }
      ];
    } else if (formType === 'overtime') {
      fieldsList = [
        { label: 'Control Number', value: controlNumber },
        { label: 'Status', value: statusText },
        { label: 'Full Name', value: fullName },
        { label: 'Submitted On', value: submittedOn },
        { label: 'Overtime Date', value: payload.overtime_date || '' },
        { label: 'Time From', value: payload.time_from || '' },
        { label: 'Time To', value: payload.time_to || '' },
        { label: 'Total Hours', value: payload.total_hours || '' },
        { label: 'Remarks', value: payload.remarks || '' }
      ];
    } else {
      const ranges = Array.isArray(payload.leaveDateRanges) ? payload.leaveDateRanges : [];
      const rangeLines = ranges
        .map(r => `${(r.start || '').trim()} to ${(r.end || '').trim()}`.trim())
        .filter(Boolean);
      const combinedRanges = rangeLines.length ? rangeLines.join('\n') : '';
      fieldsList = [
        { label: 'Control Number', value: controlNumber },
        { label: 'Status', value: statusText },
        { label: 'Full Name', value: fullName },
        { label: 'Leave Type', value: payload.leaveType || '' },
        { label: 'Submitted On', value: submittedOn },
        { label: 'From Date', value: combinedRanges || payload.fromDate || '' },
        { label: 'Number of Days', value: payload.leavenumberdays || '' },
        { label: 'Remarks', value: payload.leaveremarks || '' }
      ];
    }

    const pdfBuffer = await createFormPdf(title, fieldsList, { office });
    const subject = `DeskHub ${title} : ${fullName} - ${controlNumber} (${statusText})`;

    const safe = (s) => (s || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const filenameSafe = [controlNumber, statusText].map(safe).filter(Boolean).join('_') || safe(controlNumber || 'form');

    const userEmail = payload.userEmail || payload.email || null;
    const recipients = [process.env.EMAIL_TO].filter(Boolean);
    if (userEmail) recipients.push(userEmail);

    if (!recipients.length) {
      return res.status(400).json({ error: 'No email recipients' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: `"DeskHub" <${process.env.EMAIL_USER}>`,
      to: recipients.join(','),
      subject,
      text: `${title} has been ${statusText.toLowerCase()}.`,
      attachments: [
        { filename: `${filenameSafe}.pdf`, content: pdfBuffer }
      ]
    });

    res.json({ id: record.id, status: record.status });
  } catch (err) {
    console.error('Error sending status email:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.post('/api/calendar/:type', async (req, res) => {
  try {
    const type = normalizeCalType(req.params.type);
    const cfg = calendarConfigs[type];
    await ensureCalendarTables();
    const payload = req.body || {};
    const dateFromRaw = (payload.date_from || payload.date || payload.start || '').toString();
    const dateFrom = dateFromRaw.split('T')[0] || null;
    const dateToRaw = (payload.date_to || payload.end || '').toString();
    const dateTo = dateToRaw ? dateToRaw.split('T')[0] : dateFrom;
    if (!dateFrom) return res.status(400).json({ message: 'Event date is required' });
    const title = payload.title || payload.event || 'Event';
    const time = payload.time || payload.event_time || '';
    const remarks = payload.remarks || payload.event_remarks || '';
    const color = payload.color || '';
    const repeat = payload.repeat || '';
    const cols = [ 'event_date', cfg.cols.from, cfg.cols.to, cfg.cols.title, cfg.cols.time, cfg.cols.remarks, cfg.cols.color ];
    const vals = [ dateFrom, dateFrom, dateTo, title, time, remarks, color ];
    if (cfg.cols.repeat) {
      cols.push(cfg.cols.repeat);
      vals.push(repeat);
    }
    const selectRepeat = cfg.cols.repeat ? `, ${cfg.cols.repeat} AS repeat` : '';
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await pool.query(
      `INSERT INTO ${cfg.table} (${cols.join(',')})
       VALUES (${placeholders})
       RETURNING id, event_date, ${cfg.cols.from} AS event_from, ${cfg.cols.to} AS event_to, ${cfg.cols.title} AS title, ${cfg.cols.time} AS time, ${cfg.cols.remarks} AS remarks, ${cfg.cols.color} AS color${selectRepeat}`,
      vals
    );
    res.status(201).json(calendarRowToEvent(type, cfg, rows[0]));
  } catch (err) {
    console.error('Failed to create calendar event', err);
    res.status(500).json({ message: 'Failed to create event' });
  }
});

app.put('/api/calendar/:type/:id', async (req, res) => {
  try {
    const type = normalizeCalType(req.params.type);
    const cfg = calendarConfigs[type];
    await ensureCalendarTables();
    const payload = req.body || {};
    const fields = [];
    const values = [];
    if (payload.date_from || payload.date || payload.start) {
      const dateRaw = (payload.date_from || payload.date || payload.start || '').toString();
      const date = dateRaw.split('T')[0] || null;
      if (date) {
        values.push(date);
        fields.push(`event_date = $${values.length}`);
        values.push(date);
        fields.push(`${cfg.cols.from} = $${values.length}`);
      }
    }
    if (payload.date_to || payload.end) {
      const dateRaw = (payload.date_to || payload.end || '').toString();
      const date = dateRaw.split('T')[0] || null;
      if (date) {
        values.push(date);
        fields.push(`${cfg.cols.to} = $${values.length}`);
      }
    }
    if (payload.title !== undefined) {
      values.push(payload.title || payload.event || 'Event');
      fields.push(`${cfg.cols.title} = $${values.length}`);
    }
    if (payload.time !== undefined || payload.event_time !== undefined) {
      values.push(payload.time || payload.event_time || '');
      fields.push(`${cfg.cols.time} = $${values.length}`);
    }
    if (payload.remarks !== undefined || payload.event_remarks !== undefined) {
      values.push(payload.remarks || payload.event_remarks || '');
      fields.push(`${cfg.cols.remarks} = $${values.length}`);
    }
    if (payload.color !== undefined) {
      values.push(payload.color || '');
      fields.push(`${cfg.cols.color} = $${values.length}`);
    }
    if (cfg.cols.repeat && payload.repeat !== undefined) {
      values.push(payload.repeat || '');
      fields.push(`${cfg.cols.repeat} = $${values.length}`);
    }
    if (!fields.length) return res.status(400).json({ message: 'No fields to update' });
    values.push(req.params.id);
    const setClause = `${fields.join(', ')}, updated_at = NOW()`;
    const selectRepeat = cfg.cols.repeat ? `, ${cfg.cols.repeat} AS repeat` : '';
    const { rows } = await pool.query(
      `UPDATE ${cfg.table}
       SET ${setClause}
       WHERE id = $${values.length}
       RETURNING id,
                 event_date,
                 ${cfg.cols.from} AS event_from,
                 ${cfg.cols.to} AS event_to,
                 ${cfg.cols.title} AS title,
                 ${cfg.cols.time} AS time,
                 ${cfg.cols.remarks} AS remarks,
                 ${cfg.cols.color} AS color${selectRepeat}`,
      values
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(calendarRowToEvent(type, cfg, rows[0]));
  } catch (err) {
    console.error('Failed to update calendar event', err);
    res.status(500).json({ message: 'Failed to update event' });
  }
});

app.delete('/api/calendar/:type/:id', async (req, res) => {
  try {
    const type = normalizeCalType(req.params.type);
    const cfg = calendarConfigs[type];
    await ensureCalendarTables();
    await pool.query(`DELETE FROM ${cfg.table} WHERE id = $1`, [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Failed to delete calendar event', err);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

app.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));
console.log('PDF generated. Preparing to send email...');
