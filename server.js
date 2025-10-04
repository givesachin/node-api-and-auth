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
  const token = req.headers['authorization']?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).send('Token missing');

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).send('Invalid token');
    req.user = user;
    next();
  });
}

// -------------------
// User Registration
// -------------------
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.send('Username & password required');

  const exists = await db('users').where({ username }).first();
  if (exists) return res.send('Username already exists');

  await db('users').insert({ username, password });
  res.send('Registration successful. <a href="/login.html">Login</a>');
});

// -------------------
// User Login
// -------------------
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db('users').where({ username, password }).first();
  if (!user) return res.send('Invalid credentials');

  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
  res.send(`Login successful! Your token:<br><input style="width:500px;" value="${token}" readonly><br><a href="/items.html?token=${token}">Go to Items</a>`);
});

// -------------------
// CRUD for Items
// -------------------

// Create
app.post('/items', authenticateToken, async (req, res) => {
  const { name } = req.body;
  await db('items').insert({ name });
  res.redirect(`/items.html?token=${req.query.token || req.body.token}`);
});

// Read all
app.get('/items/list', authenticateToken, async (req, res) => {
  const items = await db('items').select('*');
  res.json(items);
});

// Update
app.post('/items/update', authenticateToken, async (req, res) => {
  const { id, name } = req.body;
  await db('items').where({ id }).update({ name });
  res.redirect(`/items.html?token=${req.body.token}`);
});

// Delete
app.post('/items/delete', authenticateToken, async (req, res) => {
  const { id } = req.body;
  await db('items').where({ id }).del();
  res.redirect(`/items.html?token=${req.body.token}`);
});

// -------------------
// Start Server
// -------------------
app.listen(PORT, '0.0.0.0
