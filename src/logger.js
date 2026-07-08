const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { config } = require('./config');
const appEvents = require('./events');

if (!fs.existsSync(config.logging.dir)) {
  fs.mkdirSync(config.logging.dir, { recursive: true });
}

const consoleFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const formattedMessage = `[${timestamp}] ${level.toUpperCase().padEnd(7)} ${message}${metaStr}`;
  // Emit to event bus for Electron UI
  appEvents.emit('log', { level, message: formattedMessage, timestamp });
  return formattedMessage;
});

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
      ),
    }),
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'pa.log'),
      format: winston.format.combine(winston.format.json()),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'errors.log'),
      level: 'error',
      format: winston.format.combine(winston.format.json()),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
  ],
});

module.exports = logger;
