const { config, validateConfig } = require('./config');
const logger = require('./logger');
const { createWhatsAppClient } = require('./whatsapp/client');
const { startAllSchedulers } = require('./services/scheduler');
const { formatBanner } = require('./utils/formatter');

async function main() {
  validateConfig(logger);

  console.log(formatBanner('PA — AI EXECUTIVE ASSISTANT (Backend)'));
  logger.info('Starting PA backend...');
  logger.info(`AI model: ${config.groq.model}`);
  logger.info(`Notify threshold: ${config.behavior.notifyThreshold}`);

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
