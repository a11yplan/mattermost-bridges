import { config } from './config';

// Define log levels and their numerical values for comparison
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

// Get the configured log level
const configuredLevel = (config.logLevel as LogLevel) || 'info';

// Utility to check if we should log at a specific level
const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
};

// Format the log message with timestamp and level
const formatLog = (level: LogLevel, message: string, ...args: any[]): string => {
  const timestamp = new Date().toISOString();
  let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  // Add formatted objects if any
  if (args.length > 0) {
    try {
      const formattedArgs = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
      ).join(' ');
      formattedMessage += ` ${formattedArgs}`;
    } catch (error) {
      formattedMessage += ` [Error formatting arguments: ${error}]`;
    }
  }
  
  return formattedMessage;
};

// Logger implementation
export const logger = {
  debug: (message: string, ...args: any[]): void => {
    if (shouldLog('debug')) {
      console.log(formatLog('debug', message, ...args));
    }
  },
  
  info: (message: string, ...args: any[]): void => {
    if (shouldLog('info')) {
      console.log(formatLog('info', message, ...args));
    }
  },
  
  warn: (message: string, ...args: any[]): void => {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, ...args));
    }
  },
  
  error: (message: string, ...args: any[]): void => {
    if (shouldLog('error')) {
      console.error(formatLog('error', message, ...args));
    }
  },
  
  // Specialized method for logging payloads, respecting the LOG_PAYLOADS config
  payload: (message: string, payload: any): void => {
    if (shouldLog('debug') && config.logPayloads) {
      console.log(formatLog('debug', `${message} PAYLOAD:`, payload));
    } else if (shouldLog('debug')) {
      // If payload logging is disabled, just log that we received/sent something
      console.log(formatLog('debug', `${message} (payload logging disabled)`));
    }
  },
};