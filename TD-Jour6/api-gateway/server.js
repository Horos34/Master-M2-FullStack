const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const auth = require('basic-auth');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware sécurité
app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173' })); // React Vite
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting (100 req/15min/IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'error', message: 'Trop de requêtes' }
});
app.use('/api/', limiter);

// Auth basique pour admin (user: admin, pass: gateway123)
const checkAuth = (req, res, next) => {
  const credentials = auth(req);
  if (!credentials || credentials.name !== 'admin' || credentials.pass !== 'gateway123') {
    res.set('WWW-Authenticate', 'Basic realm="API Gateway"');
    return res.status(401).json({ status: 'error', message: 'Accès refusé' });
  }
  next();
};

// Health check global
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    services: { go: 'http://localhost:8083/health', node: 'http://localhost:8082/health' }
  });
});

// Routes vers services backend
app.use('/api/go', createProxyMiddleware({
  target: 'http://localhost:8083',
  changeOrigin: true,
  pathRewrite: { '^/api/go': '' },
  onProxyReq: (proxyReq) => console.log('Proxy GO:', proxyReq.path)
}));

app.use('/api/node', createProxyMiddleware({
  target: 'http://localhost:8082',
  changeOrigin: true,
  pathRewrite: { '^/api/node': '' },
  onProxyReq: (proxyReq) => console.log('Proxy NODE:', proxyReq.path)
}));

// Route admin protégée (stats futures)
app.get('/api/admin/stats', checkAuth, (req, res) => {
  res.json({ 
    status: 'success', 
    uptime: process.uptime(),
    requests: morgan._getTotalCount?.() || 'N/A'
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route non trouvée' });
});

app.listen(PORT, () => {
  console.log(`API Gateway sur http://localhost:${PORT}`);
  console.log(`- /api/go/* → Go API (8083)`);
  console.log(`- /api/node/* → Node API (8082)`);
});
