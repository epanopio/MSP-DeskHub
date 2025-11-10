// server.js

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL pool setup
const pool = new Pool({
  user: 'postgres',           // your PostgreSQL user
  host: 'localhost',
  database: 'deskhub',     // your database name
  password: 'S0lut10n!',  // your database password
  port: 5432,
});

// Make pool available in routes
app.locals.pool = pool;

// Middlewares
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..'))); // serve frontend files from project root

// Import routers
const itemsRouter = require('./routes/items');
const modelsRouter = require('./routes/models');
const unitsRouter = require('./routes/units');

// Mount API routes
app.use('/api/items',  itemsRouter);
app.use('/api/models', modelsRouter);
app.use('/api/units',  unitsRouter);

// Fallback for unknown routes (optional)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
