/**
 * Interface for configuration loaders (Interface Segregation Principle)
 * Defines common contract for all loader types
 */
export interface IConfigLoader<T = any> {
    /**
     * Loads configuration from a file
     * @param filePath Path to the configuration file
     * @returns Promise with the parsed configuration
     */
    load(filePath: string): Promise<T>;

    /**
     * Validates if the file can be processed by this loader
     * @param filePath File path
     * @returns true if the file is supported
     */
    canHandle(filePath: string): boolean;

    /**
     * Returns supported file extensions
     */
    getSupportedExtensions(): string[];
}

/**
 * Specific interface for Nomad configurations
 */
export interface INomadJobConfig {
    job: {
        id: string;
        name: string;
        type: 'service' | 'batch' | 'system';
        datacenters: string[];
        group?: {
            [key: string]: any;
        };
        [key: string]: any;
    };
}

/**
 * Result of the loading process
 */
export interface ILoadResult<T> {
    data: T;
    filePath: string;
    format: string;
    loadedAt: Date;
}