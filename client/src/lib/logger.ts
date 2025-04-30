/**
 * Simple logging utility for the client-side application
 * Provides consistent logging format and supports logging operations with timing
 */

// Log levels
enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

// Function to format messages consistently
const formatMessage = (level: LogLevel, message: string, details?: any): string => {
  let formattedMessage = `[${level}] ${message}`;
  
  // Add preview string for large objects
  if (details) {
    if (typeof details === 'object') {
      const preview = JSON.stringify(details).substring(0, 100);
      formattedMessage += ` - ${preview}${preview.length >= 100 ? '...' : ''}`;
    } else {
      formattedMessage += ` - ${details}`;
    }
  }
  
  return formattedMessage;
};

// Basic logging functions
export const logger = {
  info: (message: string, details?: any) => {
    console.log(formatMessage(LogLevel.INFO, message, details));
  },
  
  warn: (message: string, details?: any) => {
    console.warn(formatMessage(LogLevel.WARN, message, details));
  },
  
  error: (message: string, details?: any) => {
    console.error(formatMessage(LogLevel.ERROR, message, details));
  },
  
  debug: (message: string, details?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage(LogLevel.DEBUG, message, details));
    }
  },
  
  // Timed operation logging - returns a function that ends the timer and logs the duration
  timeOperation: (operationName: string) => {
    const startTime = performance.now();
    
    return {
      end: (status: 'success' | 'failure' = 'success', details?: any) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        const message = `${operationName} - ${status} - ${duration.toFixed(2)}ms`;
        if (status === 'success') {
          logger.info(message, details);
        } else {
          logger.error(message, details);
        }
        
        return duration;
      }
    };
  }
};