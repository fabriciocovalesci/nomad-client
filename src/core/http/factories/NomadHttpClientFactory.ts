import { HttpClient } from '../HttpClient';
import { IHttpClient, IHttpClientConfig } from '../interfaces/IHttpClient';
import { NomadConfigManager } from '../../../config/NomadConfig';

/**
 * Factory to create HttpClient configured for Nomad
 * Follows Factory Pattern and Single Responsibility Principle
 */
export class NomadHttpClientFactory {
    
    /**
     * Creates HttpClient configured with Nomad settings
     */
    public static createFromNomadConfig(configManager: NomadConfigManager): IHttpClient {
        const nomadConfig = configManager.getConfig();
        
        const httpConfig: IHttpClientConfig = {
            baseURL: nomadConfig.host,
            timeout: 30000,
            headers: {
                'X-Nomad-Token': nomadConfig.secretID || '',
                'Content-Type': 'application/json'
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
}