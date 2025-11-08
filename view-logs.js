#!/usr/bin/env node
// Helper script to view and analyze logs
// Usage: node view-logs.js [options]

import fs from 'fs';
import path from 'path';

const logDir = 'logs';
const currentLogFile = path.join(logDir, 'current-session.log');
const allLogsFile = path.join(logDir, 'app.log');

function viewCurrentSession() {
  if (!fs.existsSync(currentLogFile)) {
    console.log('No current session log found. Start the dev server first.');
    return;
  }

  const content = fs.readFileSync(currentLogFile, 'utf-8');
  console.log('=== CURRENT SESSION LOG ===\n');
  console.log(content);
}

function viewAllLogs() {
  if (!fs.existsSync(allLogsFile)) {
    console.log('No logs found.');
    return;
  }

  const content = fs.readFileSync(allLogsFile, 'utf-8');
  console.log('=== ALL LOGS ===\n');
  console.log(content);
}

function parseAndFormat(jsonLine) {
  try {
    const entry = JSON.parse(jsonLine);
    const time = new Date(entry.timestamp).toLocaleTimeString();
    return `[${time}] ${entry.level.toUpperCase()}: ${entry.message} ${entry.data ? JSON.stringify(entry.data) : ''}`;
  } catch {
    return jsonLine;
  }
}

function viewCurrentSessionPretty() {
  if (!fs.existsSync(currentLogFile)) {
    console.log('No current session log found. Start the dev server first.');
    return;
  }

  const content = fs.readFileSync(currentLogFile, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  console.log('=== CURRENT SESSION LOG (FORMATTED) ===\n');
  lines.forEach(line => {
    if (line.startsWith('=====')) {
      console.log('\n' + line + '\n');
    } else if (line.trim().startsWith('{')) {
      console.log(parseAndFormat(line));
    }
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'current';

switch (command) {
  case 'current':
    viewCurrentSession();
    break;
  case 'pretty':
    viewCurrentSessionPretty();
    break;
  case 'all':
    viewAllLogs();
    break;
  default:
    console.log('Usage: node view-logs.js [current|pretty|all]');
    console.log('  current - View raw current session log (default)');
    console.log('  pretty  - View formatted current session log');
    console.log('  all     - View all historical logs');
}
