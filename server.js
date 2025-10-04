require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 36535;
const SECRET_KEY = process.env.JWT_SECRET;

app.use(bodyParser.json());

// -------------------
// AUTHENTICATION
// -------------------
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.DB_USER && password === process.env.DB_PASSWORD) {
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
    return res.json({ token });
  }
  res.status(401).json({ message: 'Invalid credentials' });
});

// -------------------
// JWT Middleware
// -------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token missing' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// -------------------
// CRUD Routes
// -------------------

// Create
app.post('/items', authenticateToken, async (req, res) => {
  const { name } = req.body;
  try {
    const [id] = await db('items').insert({ name });
    const newItem = await db('items').where({ id }).first();
    res.json(newItem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Read all
app.get('/items', authenticateToken, async (req, res) => {
  try {
    const items = await db('items').select('*');
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Read one
app.get('/items/:id', authenticateToken, async (req, res) => {
  try {
    const item = await db('items').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update
app.put('/items/:id', authenticateToken, async (req, res) => {
  try {
    await db('items').where({ id: req.params.id }).update({ name: req.body.name });
    const updated = await db('items').where({ id: req.params.id }).first();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete
app.delete('/items/:id', authenticateToken, async (req, res) => {
  try {
    const item = await db('items').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await db('items').where({ id: req.params.id }).del();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------
// Start Server
// -------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
