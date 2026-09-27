const logger = require('../utils/logger');

// Connected clients list
let sseClients = [];

function registerClient(req, res) {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Prevent proxy buffering
  });

  const clientId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const newClient = {
    id: clientId,
    res,
    user: req.user || null
  };

  sseClients.push(newClient);
  logger.info(`⚡ [REALTIME] Client connected: ${clientId} (Total active: ${sseClients.length})`);

  // Send initial handshake event
  res.write(`event: connected\ndata: ${JSON.stringify({
    status: 'connected',
    clientId,
    timestamp: new Date().toISOString(),
    system: 'WORLD MONITOR REAL-TIME TELEMETRY FEED'
  })}\n\n`);

  // Heartbeat ping every 25 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 25000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(c => c.id !== clientId);
    logger.info(`🔌 [REALTIME] Client disconnected: ${clientId} (Remaining: ${sseClients.length})`);
  });
}

// Broadcast event to all or role-filtered connected clients
function broadcast(eventType, data, roleTarget = 'ALL') {
  const payload = JSON.stringify({
    type: eventType,
    data,
    timestamp: new Date().toISOString()
  });

  sseClients.forEach(client => {
    try {
      if (roleTarget === 'ALL' || (client.user && client.user.role === roleTarget)) {
        client.res.write(`event: ${eventType}\ndata: ${payload}\n\n`);
      }
    } catch (err) {
      logger.warn(`Failed to send event to client ${client.id}: ${err.message}`);
    }
  });
}

// Simulated real-time sensor updates every 45 seconds to keep the command center alive
setInterval(() => {
  if (sseClients.length > 0) {
    // Slight jitter to rainfall / wind for realistic live feel
    const randomRainDrift = +(Math.random() * 0.4 - 0.2).toFixed(1);
    const randomWindDrift = Math.floor(Math.random() * 3 - 1);
    
    broadcast('telemetry_pulse', {
      station: 'CS-ST01 (Kham River)',
      rainfallIncrement: randomRainDrift,
      windSpeedJitter: randomWindDrift,
      timestamp: new Date().toLocaleTimeString()
    });
  }
}, 45000);

module.exports = {
  registerClient,
  broadcast
};
