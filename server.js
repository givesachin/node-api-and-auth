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

  // 1️⃣ Check Authorization header (Bearer <token>)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2️⃣ If not in header, check query (?token=...)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  // 3️⃣ If still not found, check POST body (for form/json submissions)
  if (!token && req.body.token) {
    token = req.body.token;
  }

  // 4️⃣ Handle missing token
  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  // 5️⃣ Verify token
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}


// Routes
app.get('/login', function(req, res) {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', function(req, res) {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/items', function(req, res) {
  res.sendFile(path.join(__dirname, 'views', 'items.html'));
});

// -------------------
// User Registration
// -------------------
app.post('/register', async function(req, res) {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) return res.send('Username & password required');

  try {
    const existing = await db('users').where({ username }).first();
    if (existing) return res.send('Username already exists');

    await db('users').insert({ username: username, password: password });
    res.send('Registration successful. <a href="/login">Login</a>');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error: ' + err.message);
  }
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

