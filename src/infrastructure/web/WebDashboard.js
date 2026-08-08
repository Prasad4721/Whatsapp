const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const QRCode = require('qrcode');

class WebDashboard {
  constructor(container) {
    this.logger = container.resolve('Logger');
    this.eventBus = container.resolve('EventBus');
    
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server);
    this.port = process.env.PORT || 3000;
    
    this.currentStatus = 'initializing';
    this.currentQr = null;

    this._setupRoutes();
    this._setupSocket();
    this._subscribeToEvents();
  }

  _setupRoutes() {
    this.app.use(express.static(path.join(process.cwd(), 'ui')));
    this.app.use('/node_modules', express.static(path.join(process.cwd(), 'node_modules')));
  }

  _setupSocket() {
    this.io.on('connection', (socket) => {
      this.logger.info('Web client connected to dashboard');
      socket.emit('status-update', this.currentStatus);
      if (this.currentStatus === 'needs_scan' && this.currentQr) {
        socket.emit('qr-code', this.currentQr);
      }
    });
  }

  _subscribeToEvents() {
    // Stream logs to UI
    this.eventBus.subscribe('log', (logEntry) => {
      this.io.emit('log-entry', logEntry);
    });

    // Stream QR codes
    this.eventBus.subscribe('whatsapp.qr', async (qrCode) => {
      this.currentStatus = 'needs_scan';
      try {
        const qrDataUrl = await QRCode.toDataURL(qrCode, {
          width: 250,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' }
        });
        this.currentQr = qrDataUrl;
        this.io.emit('qr-code', qrDataUrl);
      } catch (err) {
        this.logger.error(`Error generating QR code image: ${err.message}`);
      }
    });

    // Stream status updates
    this.eventBus.subscribe('whatsapp.status', (status) => {
      this.currentStatus = status;
      if (status === 'authenticated' || status === 'ready') {
        this.currentQr = null;
      }
      this.io.emit('status-update', status);
    });
  }

  start() {
    this.server.listen(this.port, () => {
      this.logger.info(`Web Dashboard running at http://localhost:${this.port}`);
    });
  }
}

module.exports = WebDashboard;
