const { config, validateConfig } = require('./config');
const logger = require('./logger');
const { createWhatsAppClient } = require('./whatsapp/client');
const { startAllSchedulers } = require('./services/scheduler');
const { formatBanner } = require('./utils/formatter');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const appEvents = require('./events');
const QRCode = require('qrcode');

async function main() {
  validateConfig(logger);

  console.log(formatBanner('PA — AI EXECUTIVE ASSISTANT (Backend)'));
  logger.info('Starting PA backend...');
  logger.info(`AI model: ${config.groq.model}`);
  logger.info(`Notify threshold: ${config.behavior.notifyThreshold}`);

  // Setup Express and Socket.IO
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  app.use(express.static(path.join(__dirname, '../ui')));
  app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));

  let currentStatus = 'initializing';
  let currentQr = null;

  io.on('connection', (socket) => {
    logger.info('Web client connected');
    socket.emit('status-update', currentStatus);
    if (currentStatus === 'needs_scan' && currentQr) {
      socket.emit('qr-code', currentQr);
    }
  });

  appEvents.on('log', (logEntry) => {
    io.emit('log-entry', logEntry);
  });

  appEvents.on('qr', async (qrCode) => {
    currentStatus = 'needs_scan';
    try {
      const qrDataUrl = await QRCode.toDataURL(qrCode, {
        width: 250,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      currentQr = qrDataUrl;
      io.emit('qr-code', qrDataUrl);
    } catch (err) {
      logger.error(`Error generating QR code image: ${err.message}`);
    }
  });

  appEvents.on('status', (status) => {
    currentStatus = status;
    if (status === 'authenticated' || status === 'ready') {
      currentQr = null; // Clear QR when authenticated
    }
    io.emit('status-update', status);
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      logger.info(`Web interface running at https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
    } else {
      logger.info(`Web interface running at http://localhost:${PORT}`);
    }
  });

  const client = createWhatsAppClient();
  startAllSchedulers();

  client.initialize();

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    try {
      await client.destroy();
      logger.info('WhatsApp client destroyed cleanly.');
    } catch (err) {
      logger.error(`Error during shutdown: ${err.message}`);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: reason?.message || reason });
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  });
}

if (require.main === module) {
  main();
}

module.exports = { startBackend: main };
