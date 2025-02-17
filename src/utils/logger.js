const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

class Logger {
  static debug(message, data) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  }

  static info(message, data) {
    console.log(`[INFO] ${message}`, data || '');
  }

  static warn(message, data) {
    console.warn(`[WARN] ${message}`, data || '');
  }

  static error(message, error) {
    console.error(`[ERROR] ${message}`, error || '');
  }
}

export default Logger; 