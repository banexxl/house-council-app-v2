/**
 * UI Logger utility for client-side logging
 * Logs messages conditionally based on environment (localhost vs production)
 */

type LogType = 'log' | 'info' | 'warn' | 'error' | 'debug';

/**
 * Determines if logging should be enabled based on environment
 */
const shouldLog = (): boolean => {
     const isDevelopment = process.env.NODE_ENV === 'development';
     const isLocalhost = typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.includes('localhost'));

     return isDevelopment || isLocalhost;
};

/**
 * Single logger function with message and log type parameters
 */
export const log = (message: string, type: LogType = 'log'): void => {
     if (!shouldLog()) return;
     console[type](message);
};

export default log;