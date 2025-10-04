// server.js
const express = require('express');
const app = express();

// Port (use environment variable or fallback to 3000)
const PORT = process.env.PORT || 36535;

// Simple homepage route
app.get('/', (req, res) => {
  res.send('Node test server is running');
});

// Another test route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from aaPanel Node server!' });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
