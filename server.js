// KIVI Draft - Express Server with Socket.IO for debugging
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;
const logDir = 'logs';
const logFile = path.join(logDir, 'app.log');
const currentLogFile = path.join(logDir, 'current-session.log');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Session start marker
const sessionStart = `\n========== SESSION START: ${new Date().toISOString()} ==========\n`;
fs.appendFileSync(logFile, sessionStart);
fs.writeFileSync(currentLogFile, sessionStart);

console.log('KIVI Draft server starting...');

// Serve static files
app.use(express.static('.'));
app.use('/three', express.static(path.join(__dirname, 'node_modules/three')));

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// HTTP endpoint for logging (fallback)
app.use(express.json());
app.post('/log', (req, res) => {
  try {
    const logLine = JSON.stringify(req.body) + '\n';
    fs.appendFileSync(logFile, logLine);
    fs.appendFileSync(currentLogFile, logLine);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Store connected clients
const clients = new Set();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  clients.add(socket);

  // Handle logging from client
  socket.on('log', (data) => {
    try {
      const logLine = JSON.stringify(data) + '\n';
      fs.appendFileSync(logFile, logLine);
      fs.appendFileSync(currentLogFile, logLine);
    } catch (error) {
      console.error('Error writing log:', error);
    }
  });

  // Handle debug commands
  socket.on('debug', (data, callback) => {
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
          if (fs.existsSync(currentLogFile)) {
            response.result = fs.readFileSync(currentLogFile, 'utf-8');
          } else {
            response.result = 'No logs available';
          }
          break;

        case 'clearLogs':
          fs.writeFileSync(currentLogFile, sessionStart);
          response.result = 'Logs cleared';
          break;

        case 'getStats':
          const stats = fs.statSync(currentLogFile);
          response.result = {
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
          break;

        case 'eval':
          // Server-side eval (DANGEROUS - single-user only!)
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
          response.result = 'Client eval sent to ' + clients.size + ' client(s)';
          io.emit('client-eval', { code: payload.code });
          break;

        default:
          response.error = `Unknown command: ${command}`;
      }
    } catch (error) {
      response.error = error.message;
      response.stack = error.stack;
    }

    if (callback) {
      callback(response);
    } else {
      socket.emit('debug-response', response);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clients.delete(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`\n✅ KIVI Draft server running at http://localhost:${PORT}\n`);
});
