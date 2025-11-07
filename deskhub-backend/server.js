const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// PostgreSQL DB config
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'deskhub',
  password: 'S0lut10n!',
  port: 5432,
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set true if using HTTPS
}));

// Serve static HTML files
app.use(express.static(path.join(__dirname, '..')));

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', username, '/', password);
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);

    if (result.rows.length > 0) {
      req.session.user = {
        id: result.rows[0].id,
        username: result.rows[0].username,
        role: result.rows[0].role
      };
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Logout Route
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Could not log out.');
    res.redirect('/login.html');
  });
});

// Middleware to protect routes
function checkAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login.html');
  }
}

// Protect these routes
app.get('/index.html', checkAuth);
app.get('/items.html', checkAuth);

app.listen(port, () => {
  console.log(`✅ DESKHUB backend running at http://localhost:${port}`);
});
