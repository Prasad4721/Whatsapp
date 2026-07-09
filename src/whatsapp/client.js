const { Client, LocalAuth } = require('whatsapp-web.js');
const chalk = require('chalk');
const logger = require('../logger');
const { handleIncomingMessage } = require('../services/messageHandler');
const { formatBanner } = require('../utils/formatter');
const appEvents = require('../events');

function createWhatsAppClient() {
  const authPath = process.env.WWEBJS_AUTH_PATH || './.wwebjs_auth';

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: authPath }),
    puppeteer: {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });

  client.on('qr', (qr) => {
    console.log(formatBanner('SCAN THIS QR CODE WITH WHATSAPP > LINKED DEVICES'));
    logger.info('QR code generated — waiting for scan on web UI.');
    appEvents.emit('qr', qr);
  });

  client.on('authenticated', () => {
    logger.info('WhatsApp authenticated successfully.');
    appEvents.emit('status', 'authenticated');
  });

  client.on('auth_failure', (msg) => {
    logger.error(`WhatsApp authentication failed: ${msg}`);
  });

  client.on('ready', () => {
    console.log(formatBanner('✅ PA IS ONLINE — MONITORING WHATSAPP'));
    logger.info('WhatsApp client ready. PA is now monitoring incoming messages.');
    appEvents.emit('status', 'ready');
  });

  client.on('disconnected', (reason) => {
    logger.warn(`WhatsApp disconnected: ${reason}`);
  });

  client.on('message', async (msg) => {
    await handleIncomingMessage(msg, client);
  });

  return client;
}

module.exports = { createWhatsAppClient };
