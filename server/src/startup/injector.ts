import { container } from 'tsyringe';

/**
 * Initialize Dependency Injection Container
 * - Registers global dependencies
 * - Sets up any necessary singletons
 */
export async function setupInjector(): Promise<void> {
    // Currently we just need the container to be active.
    // Future dependencies (like Database, Config) can be registered here.
    console.log('[Startup] DI Container initialized');
}
