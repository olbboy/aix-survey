/**
 * Winston Logger Service
 * Structured logging with proper log levels and security
 */

import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Define transports
const transports = [];

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// File transports for all environments
const logsDir = path.join(process.cwd(), 'logs');

transports.push(
  // Error log
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  // Combined log
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format,
  transports,
  defaultMeta: { service: 'aix-survey-api' },
  // Don't exit on error
  exitOnError: false,
});

/**
 * Sanitize sensitive data from log messages
 */
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
    'sessionToken',
  ];

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
}

// Create wrapper functions with sanitization
export const log = {
  error: (message: string, meta?: any) => {
    logger.error(message, sanitizeLogData(meta));
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, sanitizeLogData(meta));
  },
  info: (message: string, meta?: any) => {
    logger.info(message, sanitizeLogData(meta));
  },
  http: (message: string, meta?: any) => {
    logger.http(message, sanitizeLogData(meta));
  },
  debug: (message: string, meta?: any) => {
    logger.debug(message, sanitizeLogData(meta));
  },
};

// Export default logger for backward compatibility
export default logger;
