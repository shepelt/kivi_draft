// Vite plugin to handle filesystem logging
import fs from 'fs';
import path from 'path';

function rotateLogFile(logFile, maxSize = 1024 * 1024) { // 1MB default
  // Only rotate if file exists and exceeds max size
  if (!fs.existsSync(logFile)) return;

  const stats = fs.statSync(logFile);
  if (stats.size < maxSize) return;

  // File needs rotation
  // Rotate: app.log -> app.log.1 -> app.log.2 -> ... (keep last 5)
  const maxRotations = 5;

  // First, shift existing rotated files
  for (let i = maxRotations - 1; i >= 1; i--) {
    const currentFile = `${logFile}.${i}`;
    const nextFile = `${logFile}.${i + 1}`;

    if (fs.existsSync(currentFile)) {
      if (i === maxRotations - 1) {
        // Delete the oldest file
        fs.unlinkSync(currentFile);
      } else {
        // Shift file to next position
        fs.renameSync(currentFile, nextFile);
      }
    }
  }

  // Now rename current log to .1
  fs.renameSync(logFile, `${logFile}.1`);
}

export function loggerPlugin() {
  const logDir = 'logs';
  const logFile = path.join(logDir, 'app.log');
  const currentLogFile = path.join(logDir, 'current-session.log');

  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Rotate old logs if needed
  rotateLogFile(logFile);

  // Write session start marker
  const sessionStart = `\n========== SESSION START: ${new Date().toISOString()} ==========\n`;
  fs.appendFileSync(logFile, sessionStart);

  // Clear current session log and start fresh
  fs.writeFileSync(currentLogFile, sessionStart);

  // Store connected WebSocket clients
  const wsClients = new Set();

  return {
    name: 'vite-plugin-logger',

    configureServer(server) {
      // Handle WebSocket for logging
      server.ws.on('kivi:log', (data, client) => {
        try {
          const logLine = JSON.stringify(data) + '\n';

          // Append to both log files
          fs.appendFileSync(logFile, logLine);
          fs.appendFileSync(currentLogFile, logLine);

          // Broadcast to other connected clients (for real-time log viewing)
          wsClients.forEach(c => {
            if (c !== client) {
              c.send('kivi:log-broadcast', data);
            }
          });
        } catch (error) {
          console.error('Error writing log:', error);
        }
      });

      // Handle WebSocket connections for debugging
      server.ws.on('kivi:debug', (data, client) => {
        // Add client to set
        wsClients.add(client);

        // Handle debug commands from client
        const { command, payload } = data;

        const response = {
          command,
          timestamp: new Date().toISOString(),
          result: null,
          error: null
        };

        try {
          switch (command) {
            case 'ping':
              response.result = 'pong';
              break;

            case 'getLogs':
              // Send current session logs
              if (fs.existsSync(currentLogFile)) {
                const logs = fs.readFileSync(currentLogFile, 'utf-8');
                response.result = logs;
              } else {
                response.result = 'No logs available';
              }
              break;

            case 'clearLogs':
              // Clear current session log
              fs.writeFileSync(currentLogFile, sessionStart);
              response.result = 'Logs cleared';
              break;

            case 'getStats':
              // Get file stats
              const stats = fs.statSync(currentLogFile);
              response.result = {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime
              };
              break;

            case 'eval':
              // Execute server-side code (DANGEROUS - only for single-user debugging)
              // This should NEVER be used in production
              const originalLog = console.log;
              const logs = [];
              console.log = (...args) => {
                logs.push(args.join(' '));
                originalLog(...args);
              };

              try {
                const result = eval(payload.code);
                response.result = {
                  value: result,
                  logs
                };
              } finally {
                console.log = originalLog;
              }
              break;

            case 'clientEval':
              // Forward eval to all connected browser clients
              response.result = 'Client eval sent';
              wsClients.forEach(c => {
                c.send('kivi:client-eval', { code: payload.code });
              });
              break;

            default:
              response.error = `Unknown command: ${command}`;
          }
        } catch (error) {
          response.error = error.message;
          response.stack = error.stack;
        }

        // Send response back to client
        client.send('kivi:debug-response', response);
      });

      // HTTP middleware for logging
      server.middlewares.use((req, res, next) => {
        if (req.url === '/log' && req.method === 'POST') {
          let body = '';

          req.on('data', chunk => {
            body += chunk.toString();
          });

          req.on('end', () => {
            try {
              const logEntry = JSON.parse(body);
              const logLine = JSON.stringify(logEntry) + '\n';

              // Append to both log files
              fs.appendFileSync(logFile, logLine);
              fs.appendFileSync(currentLogFile, logLine);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
}
