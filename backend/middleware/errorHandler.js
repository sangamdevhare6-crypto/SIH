const config = require('../config/env');
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, err.stack);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(config.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
