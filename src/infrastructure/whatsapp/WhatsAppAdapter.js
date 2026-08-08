const { Client, LocalAuth } = require('whatsapp-web.js');

class WhatsAppAdapter {
  constructor(container) {
    this.logger = container.resolve('Logger');
    this.eventBus = container.resolve('EventBus');
    this.config = container.resolve('Config');
    
    const authPath = process.env.WWEBJS_AUTH_PATH || './.wwebjs_auth';

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: authPath }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      },
    });

    this._setupListeners();
  }

  _setupListeners() {
    this.client.on('qr', (qr) => {
      this.logger.info('WhatsApp QR generated.');
      this.eventBus.publish('whatsapp.qr', qr);
    });

    this.client.on('authenticated', () => {
      this.logger.info('WhatsApp authenticated.');
      this.eventBus.publish('whatsapp.status', 'authenticated');
    });

    this.client.on('ready', () => {
      this.logger.info('WhatsApp client ready.');
      this.eventBus.publish('whatsapp.status', 'ready');
    });

    this.client.on('message', async (msg) => {
      // Basic filtering before emitting
      if (msg.from === 'status@broadcast' || msg.to === 'status@broadcast') return;
      if (msg.fromMe) return;

      if (msg.hasMedia) {
        this.eventBus.publish('message.media', {
          rawMessage: msg,
          from: msg.from,
          timestamp: new Date().toISOString()
        });
      } else {
        this.eventBus.publish('message.received', {
          rawMessage: msg,
          body: msg.body,
          from: msg.from,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Subscribe to outbound messages via EventBus
    this.eventBus.subscribe('message.send', async (payload) => {
      const { to, text } = payload;
      try {
        await this.client.sendMessage(to, text);
        this.logger.info(`Message sent to ${to}`);
      } catch (err) {
        this.logger.error(`Failed to send message: ${err.message}`);
      }
    });
  }

  start() {
    this.logger.info('Starting WhatsApp Adapter...');
    return this.client.initialize();
  }
  
  stop() {
    this.logger.info('Stopping WhatsApp Adapter...');
    return this.client.destroy();
  }
}

module.exports = WhatsAppAdapter;
