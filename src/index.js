const Container = require('./core/Container');
const EventBus = require('./core/EventBus');
const Config = require('./config/index');
const Logger = require('./shared/Logger');
const { formatBanner } = require('./utils/formatter');

// Database Repositories
const JsonDatabase = require('./infrastructure/database/JsonDatabase');
const ContactRepository = require('./infrastructure/database/repositories/ContactRepository');
const MemoryRepository = require('./infrastructure/database/repositories/MemoryRepository');
const TaskRepository = require('./infrastructure/database/repositories/TaskRepository');

// Infrastructure Adapters
const WhatsAppAdapter = require('./infrastructure/whatsapp/WhatsAppAdapter');
const WebDashboard = require('./infrastructure/web/WebDashboard');

// AI Agents
const GroqAdapter = require('./ai/GroqAdapter');
const MasterAgent = require('./ai/MasterAgent');
const MemoryAgent = require('./ai/MemoryAgent');
const ContactAgent = require('./ai/ContactAgent');
const TaskAgent = require('./ai/TaskAgent');
const ReportAgent = require('./ai/ReportAgent');

// Plugins
const VisionPlugin = require('./ai/plugins/VisionPlugin');
const VoicePlugin = require('./ai/plugins/VoicePlugin');
const DocumentPlugin = require('./ai/plugins/DocumentPlugin');

// Schedulers
const ReminderScheduler = require('./scheduler/ReminderScheduler');
const FollowUpScheduler = require('./scheduler/FollowUpScheduler');
const ReportScheduler = require('./scheduler/ReportScheduler');

async function main() {
  // 1. Initialize DI Container
  const container = new Container();

  // 2. Register Core Services
  const config = new Config();
  container.register('Config', config);
  
  const eventBus = new EventBus();
  container.register('EventBus', eventBus);
  
  const logger = new Logger(container);
  container.register('Logger', logger);

  config.validate(logger);

  console.log(formatBanner('PA — AI EXECUTIVE ASSISTANT (Backend)'));
  logger.info('Starting PA backend...');
  logger.info(`AI model: ${config.groq.model}`);

  // 3. Register Data Layer
  container.register('JsonDatabase', new JsonDatabase(container));
  container.register('ContactRepository', new ContactRepository(container));
  container.register('MemoryRepository', new MemoryRepository(container));
  container.register('TaskRepository', new TaskRepository(container));

  // 4. Register Infrastructure Adapters
  container.register('WhatsAppAdapter', new WhatsAppAdapter(container));
  container.register('WebDashboard', new WebDashboard(container));

  // 5. Register AI Agents
  container.register('GroqAdapter', new GroqAdapter(container));
  container.register('MasterAgent', new MasterAgent(container));
  container.register('MemoryAgent', new MemoryAgent(container));
  container.register('ContactAgent', new ContactAgent(container));
  container.register('TaskAgent', new TaskAgent(container));
  container.register('ReportAgent', new ReportAgent(container));
  container.register('VisionPlugin', new VisionPlugin(container));
  container.register('VoicePlugin', new VoicePlugin(container));
  container.register('DocumentPlugin', new DocumentPlugin(container));

  // 6. Register Schedulers
  container.register('ReminderScheduler', new ReminderScheduler(container));
  container.register('FollowUpScheduler', new FollowUpScheduler(container));
  container.register('ReportScheduler', new ReportScheduler(container));

  // 7. Start Services
  const webDashboard = container.resolve('WebDashboard');
  const whatsappAdapter = container.resolve('WhatsAppAdapter');
  const reminderScheduler = container.resolve('ReminderScheduler');
  const followUpScheduler = container.resolve('FollowUpScheduler');

  webDashboard.start();
  reminderScheduler.start();
  followUpScheduler.start();
  
  // We initialize the whatsapp client after the dashboard is listening
  // so the QR code can be served immediately.
  whatsappAdapter.start();

  // 8. Graceful Shutdown
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    try {
      reminderScheduler.stop();
      followUpScheduler.stop();
      await whatsappAdapter.stop();
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
