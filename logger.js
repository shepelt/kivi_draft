// Simple filesystem logger for KIVI Draft
// Logs to console and file via Socket.IO

class Logger {
  constructor(options = {}) {
    this.logToConsole = options.logToConsole !== false;
    this.sessionId = Date.now();
    this.socket = null;

    // Store original console methods before interception
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console)
    };

    // Wait for Socket.IO to be available
    this._initSocket();
  }

  _initSocket() {
    if (typeof window.io !== 'undefined') {
      this.socket = window.io();
      this.socket.on('connect', () => {
        this.originalConsole.log('[Logger] Socket.IO connected');
      });
      this.socket.on('disconnect', () => {
        this.originalConsole.log('[Logger] Socket.IO disconnected');
      });
    } else {
      // Retry after a short delay
      setTimeout(() => this._initSocket(), 100);
    }
  }

  async _writeToFile(level, message, data) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      sessionId: this.sessionId,
      level,
      message,
      data
    };

    // Log to console using ORIGINAL methods (avoid infinite loop)
    if (this.logToConsole) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      this.originalConsole[consoleMethod](`[${level.toUpperCase()}]`, message, data || '');
    }

    // Send via Socket.IO if available, otherwise fall back to HTTP
    if (this.socket && this.socket.connected) {
      this.socket.emit('log', logEntry);
    } else {
      // Fallback to HTTP
      try {
        await fetch('/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry)
        });
      } catch (error) {
        // Silently fail if endpoint not available
      }
    }
  }

  info(message, data) {
    this._writeToFile('info', message, data);
  }

  warn(message, data) {
    this._writeToFile('warn', message, data);
  }

  error(message, data) {
    this._writeToFile('error', message, data);
  }

  debug(message, data) {
    this._writeToFile('debug', message, data);
  }

  // Intercept console methods to also log to file
  interceptConsole() {
    // Override console.log
    console.log = (...args) => {
      this.originalConsole.log(...args);
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      this._writeToFile('console.log', message);
    };

    // Override console.warn
    console.warn = (...args) => {
      this.originalConsole.warn(...args);
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      this._writeToFile('console.warn', message);
    };

    // Override console.error
    console.error = (...args) => {
      this.originalConsole.error(...args);
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      this._writeToFile('console.error', message);
    };

    // Override console.debug
    console.debug = (...args) => {
      this.originalConsole.debug(...args);
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      this._writeToFile('console.debug', message);
    };
  }

  // Capture uncaught errors
  setupErrorHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason?.message || event.reason,
        stack: event.reason?.stack
      });
    });

    // Catch global errors
    window.addEventListener('error', (event) => {
      this.error('Uncaught Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });
  }
}

// Create singleton instance
export const logger = new Logger();

// Auto-setup error handlers and console interception
logger.setupErrorHandlers();
logger.interceptConsole();
