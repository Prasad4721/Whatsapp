const fs = require('fs');
const path = require('path');
const winston = require('winston');

class Logger {
  constructor(container) {
    this.config = container.resolve('Config');
    this.eventBus = container.resolve('EventBus');

    if (!fs.existsSync(this.config.logging.dir)) {
      fs.mkdirSync(this.config.logging.dir, { recursive: true });
    }

    const consoleFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      const formattedMessage = `[${timestamp}] ${level.toUpperCase().padEnd(7)} ${message}${metaStr}`;
      // Emit to event bus for UI
      this.eventBus.publish('log', { level, message: formattedMessage, timestamp });
      return formattedMessage;
    });

    this.winstonLogger = winston.createLogger({
      level: this.config.logging.level,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize(), consoleFormat),
        }),
        new winston.transports.File({
          filename: path.join(this.config.logging.dir, 'pa.log'),
          format: winston.format.combine(winston.format.json()),
          maxsize: 5 * 1024 * 1024,
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: path.join(this.config.logging.dir, 'errors.log'),
          level: 'error',
          format: winston.format.combine(winston.format.json()),
          maxsize: 5 * 1024 * 1024,
          maxFiles: 3,
        }),
      ],
    });
  }

  info(msg, meta = {}) { this.winstonLogger.info(msg, meta); }
  error(msg, meta = {}) { this.winstonLogger.error(msg, meta); }
  warn(msg, meta = {}) { this.winstonLogger.warn(msg, meta); }
  debug(msg, meta = {}) { this.winstonLogger.debug(msg, meta); }
}

module.exports = Logger;
