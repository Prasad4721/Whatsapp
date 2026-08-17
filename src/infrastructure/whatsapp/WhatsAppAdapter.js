const { Client, LocalAuth } = require('whatsapp-web.js');

class WhatsAppAdapter {
  constructor(container) {
    this.logger = container.resolve('Logger');
    this.eventBus = container.resolve('EventBus');
    this.config = container.resolve('Config');
    
    const authPath = process.env.WWEBJS_AUTH_PATH || './.wwebjs_auth';

    const puppeteerOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    };

    const fs = require('fs');
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (fs.existsSync('/usr/bin/chromium')) {
      puppeteerOptions.executablePath = '/usr/bin/chromium';
    }

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: authPath }),
      puppeteer: puppeteerOptions,
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

      const isGroup = msg.from.endsWith('@g.us');
      
      // If ignoreGroups is true in config, ignore entirely
      if (isGroup && this.config.whatsapp.ignoreGroups) {
        return;
      }

      // If it's a group, only process if the bot is explicitly mentioned,
      // otherwise it will hit rate limits instantly on active groups.
      if (isGroup) {
        const botId = this.client.info.wid._serialized;
        const botNumber = this.client.info.wid.user;
        const isMentioned = (msg.mentionedIds && msg.mentionedIds.includes(botId)) || 
                            (msg.body && msg.body.includes('@' + botNumber));
        if (!isMentioned) {
          return;
        }
      }

      let senderName = msg.from;
      try {
        const contact = await msg.getContact();
        senderName = contact.name || contact.pushname || msg.from;
      } catch (err) {
        this.logger.error(`Failed to fetch contact info for ${msg.from}`);
      }

      if (msg.hasMedia) {
        this.eventBus.publish('message.media', {
          rawMessage: msg,
          from: msg.from,
          senderName,
          timestamp: new Date().toISOString()
        });
      } else {
        this.eventBus.publish('message.received', {
          rawMessage: msg,
          body: msg.body,
          from: msg.from,
          senderName,
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
