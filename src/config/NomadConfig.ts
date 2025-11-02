
/**
 * Authentication method types for Nomad API
 */
export enum AuthMethod {
    TOKEN = 'token',
    BEARER = 'bearer',
    MTLS = 'mtls'
}

/**
 * Configuration interface for Nomad client
 */
export interface INomadConfig {
    host: string;
    port?: string;
    namespace?: string;
    isTLSInsecure?: boolean;
    sslEnabled?: boolean;
    secretID?: string;
    /**
     * Authentication method to use
     * @default AuthMethod.TOKEN (X-Nomad-Token header)
     */
    authMethod?: AuthMethod;
    /**
     * Use Authorization Bearer header instead of X-Nomad-Token
     * @deprecated Use authMethod instead
     */
    useAuthorizationHeader?: boolean;
    /**
     * Region for multi-region Nomad clusters
     */
    region?: string;
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
            host: config.host ?? (process.env.NOMAD_ADDR || process.env.NOMAD_HOST || 'http://localhost'),
            port: config.port ?? process.env.NOMAD_PORT ?? "4646",
            namespace: config.namespace ?? process.env.NOMAD_NAMESPACE,
            region: config.region ?? process.env.NOMAD_REGION,
            isTLSInsecure: config.isTLSInsecure ?? false,
            sslEnabled: config.sslEnabled ?? false,
            secretID: config.secretID ?? process.env.NOMAD_TOKEN ?? process.env.NOMAD_SECRET_ID,
            authMethod: config.authMethod ?? AuthMethod.TOKEN,
            useAuthorizationHeader: config.useAuthorizationHeader ?? false,
            timeouts: config.timeouts,
            ignoreTLSWarnings: config.ignoreTLSWarnings ?? false,
            ignoreSecretTLSWarnings: config.ignoreSecretTLSWarnings ?? false,
            tls: config.tls ?? {}
        };
        
        // Validate configuration
        this.validateConfig();
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

    public get region(): string | undefined {
        return this.config.region;
    }

    public get authMethod(): AuthMethod {
        return this.config.authMethod ?? AuthMethod.TOKEN;
    }

    /**
     * Validates the current configuration
     */
    private validateConfig(): void {
        if (this.config.secretID && !this.isValidToken(this.config.secretID)) {
            console.warn('Warning: Nomad token format appears to be invalid');
        }

        if (this.config.authMethod === AuthMethod.MTLS) {
            if (!this.config.tls?.clientCertPath || !this.config.tls?.clientKeyPath) {
                throw new Error('mTLS authentication requires both clientCertPath and clientKeyPath');
            }
        }
    }

    /**
     * Validates token format (basic validation)
     */
    private isValidToken(token: string): boolean {
        if (!token) return false;
        
        // Nomad tokens are typically UUIDs or alphanumeric strings
        // UUID format: 8-4-4-4-12 characters
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        // Alternative: alphanumeric string (at least 8 characters)
        const alphanumericPattern = /^[a-zA-Z0-9_-]{8,}$/;
        
        return uuidPattern.test(token) || alphanumericPattern.test(token);
    }

    /**
     * Gets authentication headers based on configuration
     */
    public getAuthHeaders(): Record<string, string> {
        const headers: Record<string, string> = {};
        
        if (!this.config.secretID) {
            return headers;
        }

        // Handle legacy useAuthorizationHeader flag
        if (this.config.useAuthorizationHeader) {
            headers['Authorization'] = `Bearer ${this.config.secretID}`;
            return headers;
        }

        // Handle authMethod
        switch (this.config.authMethod) {
            case AuthMethod.BEARER:
                headers['Authorization'] = `Bearer ${this.config.secretID}`;
                break;
            case AuthMethod.TOKEN:
            default:
                headers['X-Nomad-Token'] = this.config.secretID;
                break;
            // MTLS doesn't use headers, authentication is via certificates
        }

        return headers;
    }

    /**
     * Gets all Nomad-specific headers
     */
    public getNomadHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            ...this.getAuthHeaders()
        };

        // Add namespace header if specified
        if (this.config.namespace) {
            headers['X-Nomad-Namespace'] = this.config.namespace;
        }

        // Add region header if specified
        if (this.config.region) {
            headers['X-Nomad-Region'] = this.config.region;
        }

        return headers;
    }

    /**
     * Checks if authentication is configured
     */
    public hasAuthentication(): boolean {
        if (this.config.authMethod === AuthMethod.MTLS) {
            return !!(this.config.tls?.clientCertPath && this.config.tls?.clientKeyPath);
        }
        return !!this.config.secretID;
    }

    /**
     * Para testes - reseta a instância
     */
    public static reset(): void {
        this.instance = null as any;
    }
}
