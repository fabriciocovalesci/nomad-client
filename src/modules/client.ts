import { IHttpClient, NomadHttpClientFactory } from '../core/http';
import { NomadConfigManager } from '../config/NomadConfig';
import { NomadJobModule, INomadJobModule } from './job';
import { NomadTaskModule, INomadTaskModule } from './task';
import { NomadNamespaceModule, INomadNamespaceModule } from './namespaces';
import { NomadAllocationModule, INomadAllocationModule } from './allocations';
import { NomadNodeModule, INomadNodeModule } from './nodes';
import { NomadNodePoolModule, INomadNodePoolModule } from './node-pools';

/**
 * Interface para o Cliente principal do Nomad
 */
export interface INomadClient {
    readonly jobs: INomadJobModule;
    readonly tasks: INomadTaskModule;
    readonly namespaces: INomadNamespaceModule;
    readonly allocations: INomadAllocationModule;
    readonly nodes: INomadNodeModule;
    readonly nodePools: INomadNodePoolModule;
    
    ping(): Promise<boolean>;
    getVersion(): Promise<string>;
    healthCheck(): Promise<HealthStatus>;
    getClusterInfo(): Promise<ClusterInfo>;
    stopAndCleanup(jobId: string, purge?: boolean): Promise<boolean>;
}

export interface HealthStatus {
    healthy: boolean;
    leader: boolean;
    peers: number;
    servers: number;
    clients: number;
    issues: string[];
}

export interface ClusterInfo {
    name: string;
    region: string;
    datacenter: string;
    version: string;
    build: string;
    revision: string;
}

/**
 * Configurações do Cliente Nomad
 */
export interface INomadClientConfig {
    baseUrl?: string;
    token?: string;
    namespace?: string;
    region?: string;
    isTLSInsecure?: boolean;
    tls?: {
        caCertPath?: string;
        clientCertPath?: string;
        clientKeyPath?: string;
    };
    timeout?: number;
}

/**
 * Cliente principal do Nomad - Ponto de acesso unificado para toda a API
 * 
 * @example
 * ```typescript
 * const nomad = new NomadClient({
 *   baseUrl: 'http://localhost:4646',
 *   token: 'your-token'
 * });
 * 
 * const jobs = await nomad.jobs.list();
 * const nodes = await nomad.nodes.list();
 * ```
 */
export class NomadClient implements INomadClient {
    private httpClient: IHttpClient;
    private configManager: NomadConfigManager;

    // Módulos da API Nomad
    public readonly jobs: NomadJobModule;
    public readonly tasks: INomadTaskModule;
    public readonly namespaces: INomadNamespaceModule;
    public readonly allocations: INomadAllocationModule;
    public readonly nodes: INomadNodeModule;
    public readonly nodePools: INomadNodePoolModule;

    constructor(config?: INomadClientConfig) {
        // Configurar cliente
        this.configManager = NomadConfigManager.initialize({
            host: config?.baseUrl || process.env.NOMAD_ADDR || 'http://localhost:4646',
            secretID: config?.token || process.env.NOMAD_TOKEN,
            namespace: config?.namespace || process.env.NOMAD_NAMESPACE || 'default',
            isTLSInsecure: config?.isTLSInsecure || false,
            tls: config?.tls
        });

        // Criar HTTP client
        this.httpClient = NomadHttpClientFactory.createFromNomadConfig(this.configManager);

        // Inicializar módulos
        this.jobs = new NomadJobModule(this.httpClient);
        this.tasks = new NomadTaskModule(this.httpClient);
        this.namespaces = new NomadNamespaceModule(this.httpClient);
        this.allocations = new NomadAllocationModule(this.httpClient);
        this.nodes = new NomadNodeModule(this.httpClient);
        this.nodePools = new NomadNodePoolModule(this.httpClient);
    }

    /**
     * Factory method para criar cliente
     */
    static create(baseUrl?: string, token?: string): NomadClient {
        return new NomadClient({ baseUrl, token });
    }

    /**
     * Verifica conectividade com Nomad
     */
    async ping(): Promise<boolean> {
        try {
            await this.httpClient.get('/v1/status/leader');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtém versão do Nomad
     */
    async getVersion(): Promise<string> {
        try {
            const response = await this.httpClient.get<any>('/v1/agent/self');
            return response.data.stats?.nomad?.version || 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Verifica saúde do cluster
     */
    async healthCheck(): Promise<HealthStatus> {
        const issues: string[] = [];
        let healthy = true;

        try {
            // Verificar líder
            const leader = await this.httpClient.get<string>('/v1/status/leader');
            const hasLeader = !!leader.data;
            
            if (!hasLeader) {
                healthy = false;
                issues.push('No leader elected');
            }

            // Verificar peers
            const peers = await this.httpClient.get<string[]>('/v1/status/peers');
            
            // Verificar nodes
            const nodes = await this.httpClient.get<any[]>('/v1/nodes');
            
            if (nodes.data.length === 0) {
                issues.push('No clients available');
            }

            return {
                healthy,
                leader: hasLeader,
                peers: peers.data.length,
                servers: peers.data.length, // Aproximado
                clients: nodes.data.length,
                issues
            };

        } catch (error) {
            return {
                healthy: false,
                leader: false,
                peers: 0,
                servers: 0,
                clients: 0,
                issues: ['Failed to connect to Nomad cluster']
            };
        }
    }

    /**
     * Obtém configuração atual
     */
    getConfig() {
        return this.configManager.getConfig();
    }

    /**
     * Atualiza configuração
     */
    updateConfig(newConfig: Partial<INomadClientConfig>) {
        this.configManager.updateConfig(newConfig);
        this.httpClient = NomadHttpClientFactory.createFromNomadConfig(this.configManager);
    }

    /**
     * Obtém informações do cluster
     */
    async getClusterInfo(): Promise<ClusterInfo> {
        try {
            const agentResponse = await this.httpClient.get<any>('/v1/agent/self');
            
            const config = agentResponse.data.config || {};
            const stats = agentResponse.data.stats || {};

            return {
                name: config.name || 'nomad',
                region: config.region || 'global',
                datacenter: config.datacenter || 'dc1',
                version: stats.nomad?.version || 'unknown',
                build: stats.nomad?.build || 'unknown',
                revision: stats.nomad?.revision || 'unknown'
            };
        } catch (error) {
            return {
                name: 'nomad',
                region: 'global',
                datacenter: 'dc1',
                version: 'unknown',
                build: 'unknown',
                revision: 'unknown'
            };
        }
    }

    /**
     * Para job e limpa recursos
     */
    async stopAndCleanup(jobId: string, purge: boolean = false): Promise<boolean> {
        try {
            await this.jobs.stop(jobId, purge);
            
            // Aguarda limpeza das allocations
            let retries = 30; // 60 segundos
            while (retries > 0) {
                const allocations = await this.jobs.allocations(jobId);
                const activeAllocs = allocations.filter(alloc => 
                    alloc.ClientStatus === 'running' || alloc.ClientStatus === 'pending'
                );

                if (activeAllocs.length === 0) {
                    return true;
                }

                await new Promise(resolve => setTimeout(resolve, 2000));
                retries--;
            }

            return false;
        } catch (error) {
            return false;
        }
    }
}