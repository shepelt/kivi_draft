// Debug interface for KIVI Draft using Socket.IO

export class DebugInterface {
  constructor() {
    this.socket = null;
    this._initSocket();
  }

  _initSocket() {
    if (typeof window.io !== 'undefined') {
      this.socket = window.io();

      this.socket.on('connect', () => {
        console.log('[Debug] Socket.IO connected');
      });

      this.socket.on('disconnect', () => {
        console.log('[Debug] Socket.IO disconnected');
      });

      // Listen for client-eval commands from CLI/server
      this.socket.on('client-eval', (data) => {
        const { code } = data;
        console.log('[Client Eval] Executing:', code);

        try {
          const result = eval(code);
          console.log('[Client Eval] Result:', result);

          // Log result
          if (window.KIVI_DRAFT?.logger) {
            window.KIVI_DRAFT.logger.info('Client eval result', {
              code,
              result,
              type: typeof result
            });
          }
        } catch (error) {
          console.error('[Client Eval] Error:', error);
          if (window.KIVI_DRAFT?.logger) {
            window.KIVI_DRAFT.logger.error('Client eval error', {
              code,
              error: error.message,
              stack: error.stack
            });
          }
        }
      });
    } else {
      // Retry after short delay
      setTimeout(() => this._initSocket(), 100);
    }
  }

  // Send debug command to server
  async sendCommand(command, payload = {}) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket.IO not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, 5000);

      this.socket.emit('debug', { command, payload }, (response) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  // Ping server
  async ping() {
    return this.sendCommand('ping');
  }

  // Get logs
  async getLogs() {
    return this.sendCommand('getLogs');
  }

  // Clear logs
  async clearLogs() {
    return this.sendCommand('clearLogs');
  }

  // Get stats
  async getStats() {
    return this.sendCommand('getStats');
  }

  // Server eval
  async evalServer(code) {
    return this.sendCommand('eval', { code });
  }

  // Pretty print logs
  async printLogs() {
    const logs = await this.getLogs();
    console.log(logs);
    return logs;
  }
}
