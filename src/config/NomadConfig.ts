
/**
 * Configuration interface for Nomad client
 */
export interface INomadConfig {
    host: string;
    port?: string
    namespace?: string;
    isTLSInsecure?: boolean;
    sslEnabled?: boolean;
    secretID?: string;
    timeouts?: {
        requestTimeoutMs?: number;
        connectionTimeoutMs?: number;
    };
    ignoreTLSWarnings?: boolean;
    ignoreSecretTLSWarnings?: boolean;
    tls?: {
        caCertPath?: string;
        clientCertPath?: string;
        clientKeyPath?: string;
    }
}

/**
 * Singleton to manage Nomad configurations
 * Implements Singleton Pattern with lazy loading
 */
export class NomadConfigManager {
    private static instance: NomadConfigManager;
    private config: INomadConfig;

    private constructor(config: INomadConfig) {
        this.config = {
            host: config.host ?? (process.env.NOMAD_HOST || 'http://localhost'),
            port: config.port ? process.env.NOMAD_PORT || "4646" : undefined,
            namespace: config.namespace ?? process.env.NOMAD_NAMESPACE,
            isTLSInsecure: config.isTLSInsecure ?? false,
            sslEnabled: config.sslEnabled ?? false,
            secretID: config.secretID ?? process.env.NOMAD_SECRET_ID,
            timeouts: config.timeouts,
            ignoreTLSWarnings: config.ignoreTLSWarnings ?? false,
            ignoreSecretTLSWarnings: config.ignoreSecretTLSWarnings ?? false,
            tls: config.tls ?? {}
        };
    }

    /**
     * Initializes or updates the configuration (Singleton Pattern)
     */
    public static initialize(config: INomadConfig): NomadConfigManager {
        if (!this.instance) {
            this.instance = new NomadConfigManager(config);
        } else {
            this.instance.updateConfig(config);
        }
        return this.instance;
    }

    /**
     * Gets the configuration manager instance
     */
    public static getInstance(): NomadConfigManager {
        if (!this.instance) {
            throw new Error('NomadConfigManager not initialized. Call initialize() first.');
        }
        return this.instance;
    }

    /**
     * Gets the current configuration
     */
    public getConfig(): INomadConfig {
        return { ...this.config };
    }

    /**
     * Updates the existing configuration
     */
    public updateConfig(newConfig: Partial<INomadConfig>): void {
        this.config = {
            ...this.config,
            ...newConfig
        };
    }

    /**
     * Gets specific configuration properties
     */
    public get baseUrl(): string {
        return `${this.config.host}:${this.config.port ? `:${this.config.port}` : ''}`;
    }

    public get secretID(): string | undefined {
        return this.config.secretID;
    }

    public get namespace(): string | undefined {
        return this.config.namespace;
    }

    public get isTLSInsecure(): boolean {
        return this.config.isTLSInsecure ?? false;
    }

    public get tls(): INomadConfig['tls'] {
        return this.config.tls;
    }

    /**
     * Para testes - reseta a instância
     */
    public static reset(): void {
        this.instance = null as any;
    }
}
