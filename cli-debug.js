#!/usr/bin/env node
// CLI tool for LLMs to interact with running KIVI Draft app via Socket.IO
// Usage: node cli-debug.js <command> [args...]

import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';

async function sendCommand(command, payload = {}) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL);
    let timeout;

    socket.on('connect', () => {
      // Set timeout
      timeout = setTimeout(() => {
        socket.close();
        reject(new Error('Command timeout'));
      }, 5000);

      // Send command with callback
      socket.emit('debug', { command, payload }, (response) => {
        clearTimeout(timeout);
        socket.close();

        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.result);
        }
      });
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('Usage: node cli-debug.js <command> [args...]');
    console.log('');
    console.log('Commands:');
    console.log('  ping              - Test connection');
    console.log('  logs              - Get current session logs');
    console.log('  clear-logs        - Clear current session logs');
    console.log('  stats             - Get log file stats');
    console.log('  refresh           - Reload browser page');
    console.log('  eval <code>       - Execute JavaScript on server');
    console.log('  client-eval <code> - Execute JavaScript on client (browser)');
    console.log('');
    console.log('Examples:');
    console.log('  node cli-debug.js ping');
    console.log('  node cli-debug.js logs');
    console.log('  node cli-debug.js eval "console.log(\'Hello from server\')"');
    console.log('  node cli-debug.js client-eval "console.log(\'Hello from browser\')"');
    console.log('  node cli-debug.js client-eval "KIVI_DRAFT.getStats()"');
    process.exit(1);
  }

  try {
    let result;

    switch (command) {
      case 'ping':
        result = await sendCommand('ping');
        break;

      case 'logs':
        result = await sendCommand('getLogs');
        break;

      case 'clear-logs':
        result = await sendCommand('clearLogs');
        break;

      case 'stats':
        result = await sendCommand('getStats');
        break;

      case 'refresh':
        result = await sendCommand('clientEval', { code: 'location.reload()' });
        break;

      case 'eval':
        if (!args[1]) {
          console.error('Error: eval requires code argument');
          process.exit(1);
        }
        result = await sendCommand('eval', { code: args[1] });
        break;

      case 'client-eval':
        if (!args[1]) {
          console.error('Error: client-eval requires code argument');
          process.exit(1);
        }
        result = await sendCommand('clientEval', { code: args[1] });
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }

    // Output result as JSON for easy parsing by LLMs
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
