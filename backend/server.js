const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const config = require('./config/env');
const { initDatabase } = require('./config/db');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { optionalAuth } = require('./middleware/authMiddleware');
const { registerClient } = require('./services/realtimeService');

// Route imports
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const alertRoutes = require('./routes/alertRoutes');
const reportRoutes = require('./routes/reportRoutes');
const infrastructureRoutes = require('./routes/infrastructureRoutes');
const routeRoutes = require('./routes/routeRoutes');
const stationRoutes = require('./routes/stationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Security headers with configured CSP for Leaflet, Chart.js, Google Fonts, and Lucide icons
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for seamless CDN integration in command center
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: config.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Request parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve Frontend Static Files
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Rate Limiting
app.use('/api/', apiLimiter);

// Real-Time Server-Sent Events Endpoint
app.get('/api/realtime/stream', optionalAuth, (req, res) => {
  registerClient(req, res);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'WORLD MONITOR COMMAND CENTER',
    tagline: 'Real-time • Safe • Together',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/infrastructure', infrastructureRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/monitoring-stations', stationRoutes);
app.use('/api/notifications', notificationRoutes);

// Fallback for SPA/Static HTML routing
app.get('*', (req, res, next) => {
  // If request has file extension or is API, proceed to 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'Endpoint not found' });
  }
  // If asking for a direct .html or resource, check if file exists
  const targetFile = path.join(frontendPath, req.path.endsWith('.html') ? req.path : `${req.path}.html`);
  const fs = require('fs');
  if (fs.existsSync(targetFile)) {
    return res.sendFile(targetFile);
  }
  return res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized Error Handling
app.use(errorHandler);

// Start Server
async function startServer() {
  try {
    await initDatabase();
    app.listen(config.PORT, () => {
      logger.success(`🚀 WORLD MONITOR Command Center live at http://localhost:${config.PORT}`);
      logger.info(`🌐 Static UI available at: http://localhost:${config.PORT}/index.html`);
      logger.info(`📡 Real-Time SSE Stream active at: http://localhost:${config.PORT}/api/realtime/stream`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
