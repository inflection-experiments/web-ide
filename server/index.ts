import 'reflect-metadata';
import { Application } from './src/app.js';
import { logger } from './src/logger/logger.js';
import { setupInjector } from './src/startup/injector.js';

const app = Application.getInstance();
// Version Check Log
logger.info('Starting Server... Version: 1.1 (DI + Auth Fix)');

// Graceful shutdown logic
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  try {
    await app.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start application
setupInjector()
  .then(() => app.initialize())
  .then(() => app.start())
  .catch((error) => {
    logger.error('Failed to start application', error);
    process.exit(1);
  });
