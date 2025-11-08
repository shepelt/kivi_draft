import { defineConfig } from 'vite';
import { loggerPlugin } from './vite-plugin-logger.js';

export default defineConfig({
  plugins: [loggerPlugin()]
});
