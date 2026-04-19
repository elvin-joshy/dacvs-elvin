/**
 * @file server.js
 * @description Main Express application entry point.
 *              Initialises DB, blockchain read layer, middleware stack, routes, and
 *              a comprehensive /health endpoint that checks MongoDB + Flask AI engine.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const env = require('./config/env');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const blockchainService = require('./services/blockchainService');

// Route imports
const authRoutes = require('./routes/auth');
const credentialRoutes = require('./routes/credentials');
const institutionRoutes = require('./routes/institutions');
const verifyRoutes = require('./routes/verify');

const app = express();

// Initialize DB and Blockchain Read connections
connectDB();
blockchainService.initBlockchainService();

// --------------- Middleware ---------------
app.use(helmet());

// CORS — allow localhost dev + any Vercel deployment (preview & production)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://dacvs.vercel.app',    // production Vercel URL (update if different)
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any *.vercel.app subdomain (covers all preview deployments)
    if (/\.vercel\.app$/.test(origin) || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(morgan('dev'));


// --------------- Rate Limiters ---------------

/** Global limiter — 100 req/min for everything */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' }
});

/** Strict limiter — 10 req/min for credential issuance */
const issueLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Issuance rate limit reached. Max 10 per minute.' }
});

app.use(globalLimiter);

// --------------- Routes ---------------
app.use('/api/auth', authRoutes);
app.use('/api/credentials/issue', issueLimiter);   // strict limit on issuance
app.use('/api/credentials/analyze', issueLimiter);  // strict limit on analysis too
app.use('/api/credentials', credentialRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/verify', verifyRoutes);

// --------------- Health Endpoint ---------------

/**
 * @route   GET /health
 * @desc    Returns service status including MongoDB connection state and
 *          Flask AI engine reachability.
 * @access  Public
 */
app.get('/health', async (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongoStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  let flaskOk = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${env.flaskAiUrl}/ping`, { signal: controller.signal });
    clearTimeout(timeout);
    flaskOk = resp.ok;
  } catch (_) {
    flaskOk = false;
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoStatus[mongoState] || 'unknown',
      flaskAiEngine: flaskOk ? 'reachable' : 'unreachable'
    }
  });
});

// --------------- Error Handling ---------------
app.use(errorHandler);

const PORT = env.port || 3000;
app.listen(PORT, () => {
  console.log(`Backend API Server running on port ${PORT}`);
});
