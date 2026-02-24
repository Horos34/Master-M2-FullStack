const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8081;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey-changeinprod'; // À changer !

// Middleware
app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('combined'));

// Stockage users en mémoire (utilisez Redis/DB en prod)
const users = []; // [{id:1, email:'user@test.com', password:'$2b$...'}]

// POST /register
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || users.find(u => u.email === email)) {
    return res.status(400).json({ status: 'error', message: 'Email existe ou invalide' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = { id: users.length + 1, email, password: hashedPassword };
  users.push(user);

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
  res.status(201).json({ status: 'success', token, user: { id: user.id, email } });
});

// POST /login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ status: 'error', message: 'Identifiants invalides' });
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ status: 'success', token, user: { id: user.id, email } });
});

// GET /health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Middleware JWT pour autres services
app.get('/verify/:token', (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, JWT_SECRET);
    res.json({ status: 'success', user: decoded });
  } catch {
    res.status(401).json({ status: 'error', message: 'Token invalide' });
  }
});

app.listen(PORT, () => {
  console.log(`Auth Service sur http://localhost:${PORT}`);
});
