export class Logger {
  constructor(options = {}) {
    this.level = options.level ?? 'info';
    this.format = options.format ?? 'json';
  }

  log(level, message, context = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context
    };

    if (this.format === 'json') {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(entry));
    } else {
      // eslint-disable-next-line no-console
      console.log(`[${entry.timestamp}] ${level.toUpperCase()}: ${message}`);
      if (Object.keys(context).length > 0) {
        // eslint-disable-next-line no-console
        console.log(context);
      }
    }
  }

  info(message, context) {
    this.log('info', message, context);
  }

  warn(message, context) {
    this.log('warn', message, context);
  }

  error(message, context) {
    this.log('error', message, context);
  }

  debug(message, context) {
    this.log('debug', message, context);
  }

  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.level);
    const targetIndex = levels.indexOf(level);

    if (currentIndex === -1) {
      return true;
    }

    if (targetIndex === -1) {
      return false;
    }

    return targetIndex >= currentIndex;
  }
}
