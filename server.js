
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 36535;
const SECRET_KEY = process.env.JWT_SECRET;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve HTML forms
app.use(express.static(path.join(__dirname, 'views')));

// -------------------
// JWT Middleware
// -------------------
function authenticateToken(req, res, next) {
  let token = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  if (!token && req.query.token) token = req.query.token;
  if (!token && req.body.token) token = req.body.token;

  if (!token) return res.status(401).json({ success: false, error: 'Token missing' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Redirect root to /tester.html
app.get('/', (req, res) => {
  res.redirect('/tester.html');
});

// -------------------
// User Registration
// -------------------
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ success: false, error: 'Username & password required' });

  try {
    const existing = await db('users').where({ username }).first();
    if (existing) return res.status(409).json({ success: false, error: 'Username already exists' });

    await db('users').insert({ username, password });
    res.json({ success: true, message: 'Registration successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database error: ' + err.message });
  }
});

// -------------------
// User Login
// -------------------
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db('users').where({ username, password }).first();

  if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ success: true, message: 'Login successful', token });
});

// -------------------
// CRUD for Items
// -------------------

// Create
app.post('/items', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Item name required' });

  try {
    const [id] = await db('items').insert({ name });
    res.json({ success: true, message: 'Item created', item: { id, name } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Read all
app.get('/items/list', authenticateToken, async (req, res) => {
  try {
    const items = await db('items').select('*');
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update
app.post('/items/update', authenticateToken, async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) return res.status(400).json({ success: false, error: 'ID and name required' });

  try {
    await db('items').where({ id }).update({ name });
    res.json({ success: true, message: 'Item updated', item: { id, name } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete
app.post('/items/delete', authenticateToken, async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'ID required' });

  try {
    await db('items').where({ id }).del();
    res.json({ success: true, message: 'Item deleted', itemId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------
// Start Server
// -------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
