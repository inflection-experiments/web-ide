import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export interface DatabaseConfig {
    host: string;
    port: number;
    username: string;
    password?: string;
    name: string;
}

export interface JwtConfig {
    secret: string;
}

export interface MinioConfig {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
}

export interface RedisConfig {
    host: string;
    port: number;
}

class ConfigurationManager {
    private static instance: ConfigurationManager;

    public readonly env: string;
    public readonly port: number;
    public readonly db: DatabaseConfig;
    public readonly jwt: JwtConfig;
    public readonly minio: MinioConfig;
    public readonly redis: RedisConfig;

    private constructor() {
        const envVars = this.validateEnv();

        this.env = envVars.NODE_ENV;
        this.port = envVars.PORT;

        this.db = {
            host: envVars.DB_HOST,
            port: envVars.DB_PORT,
            username: envVars.DB_USERNAME,
            password: envVars.DB_PASSWORD,
            name: envVars.DB_NAME,
        };

        this.jwt = {
            secret: envVars.JWT_SECRET,
        };

        this.minio = {
            endpoint: envVars.MINIO_ENDPOINT,
            accessKey: envVars.MINIO_ACCESS_KEY,
            secretKey: envVars.MINIO_SECRET_KEY,
            bucket: envVars.MINIO_BUCKET_NAME,
        };

        this.redis = {
            host: envVars.REDIS_HOST,
            port: envVars.REDIS_PORT,
        };
    }

    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    private validateEnv(): any {
        const envSchema = Joi.object({
            NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
            PORT: Joi.number().default(9000),
            DB_HOST: Joi.string().default('localhost'),
            DB_PORT: Joi.number().default(5432),
            DB_USERNAME: Joi.string().required(),
            DB_PASSWORD: Joi.string().required(),
            DB_NAME: Joi.string().required(),
            JWT_SECRET: Joi.string().required(),
            MINIO_ENDPOINT: Joi.string().required(),
            MINIO_ACCESS_KEY: Joi.string().required(),
            MINIO_SECRET_KEY: Joi.string().required(),
            MINIO_BUCKET_NAME: Joi.string().default('code-exec'),
            REDIS_HOST: Joi.string().default('localhost'),
            REDIS_PORT: Joi.number().default(6379),
        }).unknown();

        const { value: envVars, error } = envSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

        if (error) {
            throw new Error(`Config validation error: ${error.message}`);
        }

        return envVars;
    }
}

export const configManager = ConfigurationManager.getInstance();

// Backward compatibility export (optional, but good for transition)
export const config = configManager; 
