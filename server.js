const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'beststore'
});

db.connect((err) => {
  if (err) console.error('❌ Database connection failed:', err);
  else console.log('✅ Connected to MySQL');
});

// Register
app.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  const type = 'user';
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (name, email, phone, password, type) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, hashedPassword, type],
      (err) => {
        if (err) return res.status(500).json({ message: 'User exists or DB error.' });
        res.status(200).json({ message: 'Registered successfully!' });
      }
    );
  } catch {
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (match) res.json({ name: user.name, type: user.type });
    else res.status(401).json({ message: 'Invalid credentials' });
  });
});

// Products
app.get('/products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

app.post('/add-product', (req, res) => {
  const { name, price, quantity, image_url } = req.body;
  db.query(
    'INSERT INTO products (name, price, quantity, image_url) VALUES (?, ?, ?, ?)',
    [name, price, quantity, image_url],
    (err) => {
      if (err) return res.status(500).send(err);
      res.sendStatus(200);
    }
  );
});

// Users
app.get('/users', (req, res) => {
  db.query('SELECT id, name, email, phone, type FROM users', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

app.delete('/delete-user/:id', (req, res) => {
  db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
});

// Orders
app.get('/orders', (req, res) => {
  db.query('SELECT * FROM orders ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// ✅ Fixed to include quantity
app.post('/add-order', (req, res) => {
  const { username, phone, product_name, price, status, bill_id, quantity } = req.body;
  const date = new Date().toISOString().split('T')[0];

  const q = 'INSERT INTO orders (username, phone, product_name, price, date, status, bill_id, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(q, [username, phone, product_name, price, date, status, bill_id, quantity || 1], (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
});

app.put('/update-order/:id', (req, res) => {
  const { action } = req.body;
  const statusMap = {
    confirm: 'confirmed',
    paid: 'paid',
    delivered: 'delivered',
    delete: 'cancelled'
  };
  db.query(
    'UPDATE orders SET status = ? WHERE id = ?',
    [statusMap[action] || 'pending', req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.sendStatus(200);
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
