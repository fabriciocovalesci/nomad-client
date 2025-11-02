import { HttpClient } from '../HttpClient';
import { IHttpClient, IHttpClientConfig } from '../interfaces/IHttpClient';
import { NomadConfigManager, AuthMethod } from '../../../config/NomadConfig';

/**
 * Factory to create HttpClient configured for Nomad
 * Follows Factory Pattern and Single Responsibility Principle
 */
export class NomadHttpClientFactory {
    
    /**
     * Creates HttpClient configured with Nomad settings
     * Now supports multiple authentication methods and enhanced headers
     */
    public static createFromNomadConfig(configManager: NomadConfigManager): IHttpClient {
        const nomadConfig = configManager.getConfig();
        
        const httpConfig: IHttpClientConfig = {
            baseURL: nomadConfig.host,
            timeout: nomadConfig.timeouts?.requestTimeoutMs || 30000,
            headers: {
                'Content-Type': 'application/json',
                // Use the new method to get all Nomad-specific headers
                ...configManager.getNomadHeaders()
            },
            tls: nomadConfig.tls ? {
                caCertPath: nomadConfig.tls.caCertPath,
                clientCertPath: nomadConfig.tls.clientCertPath,
                clientKeyPath: nomadConfig.tls.clientKeyPath,
                rejectUnauthorized: !nomadConfig.isTLSInsecure
            } : undefined
        };

        return new HttpClient(httpConfig);
    }

    /**
     * Creates HttpClient with custom configuration
     */
    public static create(config: IHttpClientConfig): IHttpClient {
        return new HttpClient(config);
    }

    /**
     * Creates basic HttpClient for Nomad with minimal configurations
     */
    public static createBasic(baseURL: string, token?: string): IHttpClient {
        const config: IHttpClientConfig = {
            baseURL,
            headers: token ? { 'X-Nomad-Token': token } : {}
        };

        return new HttpClient(config);
    }

    /**
     * Creates HttpClient with Bearer token authentication
     */
    public static createWithBearer(baseURL: string, token: string): IHttpClient {
        const config: IHttpClientConfig = {
            baseURL,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        return new HttpClient(config);
    }

    /**
     * Creates HttpClient with custom authentication method
     */
    public static createWithAuth(
        baseURL: string, 
        token: string, 
        authMethod: 'token' | 'bearer' = 'token',
        namespace?: string,
        region?: string
    ): IHttpClient {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        // Add authentication header
        if (authMethod === 'bearer') {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            headers['X-Nomad-Token'] = token;
        }

        // Add optional Nomad headers
        if (namespace) {
            headers['X-Nomad-Namespace'] = namespace;
        }
        if (region) {
            headers['X-Nomad-Region'] = region;
        }

        const config: IHttpClientConfig = {
            baseURL,
            headers
        };

        return new HttpClient(config);
    }
}