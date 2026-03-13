require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

// Security / middleware
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:5173',
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

app.listen(PORT, () => {
  console.log(`QuizCraft API running on http://localhost:${PORT}`);
});
