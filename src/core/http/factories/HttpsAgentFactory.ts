import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { IHttpsAgentFactory, ITLSConfig } from '../interfaces/IHttpClient';

/**
 * Factory for creating HTTPS agents (Single Responsibility + Factory Pattern)
 * Responsible only for creating and configuring HTTPS agents
 */
export class HttpsAgentFactory implements IHttpsAgentFactory {
    
    /**
     * Creates an HTTPS agent based on TLS configuration
     */
    public createAgent(tlsConfig?: ITLSConfig): https.Agent {
        if (!tlsConfig) {
            return new https.Agent();
        }

        // If TLS is marked as insecure
        if (tlsConfig.rejectUnauthorized === false) {
            return new https.Agent({ 
                rejectUnauthorized: false 
            });
        }

        // Secure TLS configuration
        const agentOptions: https.AgentOptions = {
            rejectUnauthorized: tlsConfig.rejectUnauthorized ?? true
        };

        // Load certificates if available
        try {
            if (tlsConfig.caCertPath) {
                agentOptions.ca = this.loadCertificate(tlsConfig.caCertPath);
            }

            if (tlsConfig.clientCertPath) {
                agentOptions.cert = this.loadCertificate(tlsConfig.clientCertPath);
            }

            if (tlsConfig.clientKeyPath) {
                agentOptions.key = this.loadCertificate(tlsConfig.clientKeyPath);
            }
        } catch (error) {
            throw new Error(`Failed to load TLS certificates: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return new https.Agent(agentOptions);
    }

    /**
     * Loads certificate from file with validation
     */
    private loadCertificate(certPath: string): Buffer {
        if (!certPath || typeof certPath !== 'string') {
            throw new Error('Certificate path must be a non-empty string');
        }

        const resolvedPath = path.resolve(certPath);
        
        try {
            // Check if file exists
            if (!fs.existsSync(resolvedPath)) {
                throw new Error(`Certificate file not found: ${resolvedPath}`);
            }

            // Check if it's a file
            const stats = fs.statSync(resolvedPath);
            if (!stats.isFile()) {
                throw new Error(`Certificate path is not a file: ${resolvedPath}`);
            }

            // Load the certificate
            return fs.readFileSync(resolvedPath);
            
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Failed to read certificate file: ${resolvedPath}`);
        }
    }

    /**
     * Validates TLS configuration
     */
    public static validateTLSConfig(tlsConfig: ITLSConfig): boolean {
        if (!tlsConfig) return true;

        // If rejectUnauthorized is false, no need to validate certificates
        if (tlsConfig.rejectUnauthorized === false) {
            return true;
        }

        // Validate certificate paths if provided
        const paths = [
            tlsConfig.caCertPath,
            tlsConfig.clientCertPath,
            tlsConfig.clientKeyPath
        ].filter(Boolean);

        for (const certPath of paths) {
            if (certPath && !fs.existsSync(path.resolve(certPath))) {
                throw new Error(`Certificate file not found: ${certPath}`);
            }
        }

        return true;
    }
}