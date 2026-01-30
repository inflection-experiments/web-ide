export interface ILogger {
    info(message: string, ...args: any[]): void;
    error(message: string, error?: Error, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
}

class ConsoleLogger implements ILogger {
    info(message: string, ...args: any[]): void {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }

    error(message: string, error?: Error, ...args: any[]): void {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error, ...args);
    }

    warn(message: string, ...args: any[]): void {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    }

    debug(message: string, ...args: any[]): void {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
        }
    }
}

class Logger {
    private static instance: ILogger;

    static getLogger(): ILogger {
        if (!this.instance) {
            this.instance = new ConsoleLogger();
        }
        return this.instance;
    }

    static info(message: string, ...args: any[]): void {
        this.getLogger().info(message, ...args);
    }

    static error(message: string, error?: Error, ...args: any[]): void {
        this.getLogger().error(message, error, ...args);
    }

    static warn(message: string, ...args: any[]): void {
        this.getLogger().warn(message, ...args);
    }

    static debug(message: string, ...args: any[]): void {
        this.getLogger().debug(message, ...args);
    }
}

export { Logger as logger };
