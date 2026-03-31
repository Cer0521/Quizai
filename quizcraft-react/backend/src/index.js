require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const runMigration = require('./migrate');

const app = express();
const PORT = process.env.PORT || 3001;

function parseAllowedOrigins() {
  const raw = process.env.APP_URL || '';
  return raw.split(',').map(v => v.trim()).filter(Boolean);
}

function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) return true; // non-browser clients
  if (allowedOrigins.includes(origin)) return true;

  try {
    const hostname = new URL(origin).hostname;
    if (hostname.endsWith('.vercel.app')) return true;
  } catch {
    return false;
  }

  return false;
}

const allowedOrigins = parseAllowedOrigins();

// Security / middleware
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin, allowedOrigins)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(422).json({ errors: { document: ['Document must be smaller than 5MB.'] } });
  }
  res.status(500).json({ message: err.message || 'Internal server error.' });
});

// Auto-run database migration on startup
(async () => {
  try {
    console.log('Checking database schema...');
    await runMigration();
    console.log('Database schema ready');
  } catch (err) {
    console.error('Migration warning (schema may already exist):', err.message);
    // Keep server startup resilient even if migration fails.
  }

  app.listen(PORT, () => {
    console.log(`QuizCraft API running on port ${PORT}`);
  });
})();
