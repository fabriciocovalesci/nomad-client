import { IHttpClient } from '../core/http';
import { 
    INode, 
    INodeListOptions, 
    INodeStats,
    INodeDrainRequest,
    INodeEligibilityRequest,
    INodePurgeRequest,
    NodeSchedulingEligibility
} from '../types/nodes';
import { IQueryOptions, IListResponse, IWriteResponse } from '../types/nomad';

/**
 * Interface para o módulo de Nodes
 * Baseada na API oficial: https://developer.hashicorp.com/nomad/api-docs/nodes
 */
export interface INomadNodeModule {
    // Operações básicas CRUD
    list(options?: INodeListOptions): Promise<IListResponse<INode>>;
    get(nodeId: string, options?: IQueryOptions): Promise<INode>;
    
    // Operações de gerenciamento de Node
    drain(nodeId: string, request: INodeDrainRequest): Promise<IWriteResponse>;
    eligibility(nodeId: string, eligibility: NodeSchedulingEligibility): Promise<IWriteResponse>;
    purge(nodeId: string): Promise<IWriteResponse>;
    
    // Monitoramento e estatísticas
    stats(nodeId: string): Promise<INodeStats>;
    allocations(nodeId: string, options?: IQueryOptions): Promise<any[]>;
    
    // Métodos de conveniência
    getHealthyNodes(): Promise<INode[]>;
    getNodesByClass(nodeClass: string): Promise<INode[]>;
    getNodesByPool(nodePool: string): Promise<INode[]>;
    isNodeHealthy(nodeId: string): Promise<boolean>;
    getNodeSummary(nodeId: string): Promise<{
        node: INode;
        stats: INodeStats;
        allocations: any[];
        isHealthy: boolean;
        utilizationPercent: {
            cpu: number;
            memory: number;
            disk: number;
        };
    }>;
    drainSafely(nodeId: string, deadlineMinutes?: number, ignoreSystemJobs?: boolean): Promise<IWriteResponse>;
    cancelDrain(nodeId: string): Promise<IWriteResponse>;
    markIneligible(nodeId: string): Promise<IWriteResponse>;
    markEligible(nodeId: string): Promise<IWriteResponse>;
    getClusterStats(): Promise<{
        totalNodes: number;
        healthyNodes: number;
        drainingNodes: number;
        ineligibleNodes: number;
        downNodes: number;
        nodesByClass: Record<string, number>;
        nodesByPool: Record<string, number>;
    }>;
}

/**
 * Implementação completa do módulo de Nodes do Nomad
 * Baseado na documentação oficial: https://developer.hashicorp.com/nomad/api-docs/nodes
 */
export class NomadNodeModule implements INomadNodeModule {
    constructor(private httpClient: IHttpClient) {}

    /**
     * Lista todos os nodes no cluster
     * GET /v1/nodes
     */
    async list(options: INodeListOptions = {}): Promise<IListResponse<INode>> {
        const response = await this.httpClient.get<INode[]>('/v1/nodes', {
            params: this.buildQueryParams(options)
        });

        return {
            data: response.data,
            nextToken: response.headers['X-Nomad-NextToken']
        };
    }

    /**
     * Obtém informações detalhadas de um node específico
     * GET /v1/node/:nodeID
     */
    async get(nodeId: string, options: IQueryOptions = {}): Promise<INode> {
        const response = await this.httpClient.get<INode>(`/v1/node/${nodeId}`, {
            params: this.buildQueryParams(options)
        });
        return response.data;
    }

    /**
     * Configura drain em um node (remove allocations gradualmente)
     * POST /v1/node/:nodeID/drain
     */
    async drain(nodeId: string, request: INodeDrainRequest): Promise<IWriteResponse> {
        const response = await this.httpClient.post<IWriteResponse>(
            `/v1/node/${nodeId}/drain`,
            request
        );
        return response.data;
    }

    /**
     * Define eligibilidade de scheduling para um node
     * POST /v1/node/:nodeID/eligibility
     */
    async eligibility(nodeId: string, eligibility: NodeSchedulingEligibility): Promise<IWriteResponse> {
        const request: INodeEligibilityRequest = {
            NodeID: nodeId,
            Eligibility: eligibility
        };

        const response = await this.httpClient.post<IWriteResponse>(
            `/v1/node/${nodeId}/eligibility`,
            request
        );
        return response.data;
    }

    /**
     * Remove um node do cluster permanentemente
     * POST /v1/node/:nodeID/purge
     */
    async purge(nodeId: string): Promise<IWriteResponse> {
        const request: INodePurgeRequest = {
            NodeID: nodeId
        };

        const response = await this.httpClient.post<IWriteResponse>(
            `/v1/node/${nodeId}/purge`,
            request
        );
        return response.data;
    }

    /**
     * Obtém estatísticas de recursos em tempo real do node
     * GET /v1/client/stats
     */
    async stats(nodeId: string): Promise<INodeStats> {
        const response = await this.httpClient.get<INodeStats>(`/v1/client/stats`, {
            params: { node_id: nodeId }
        });
        return response.data;
    }

    /**
     * Lista todas as allocations em um node específico
     * GET /v1/node/:nodeID/allocations
     */
    async allocations(nodeId: string, options: IQueryOptions = {}): Promise<any[]> {
        const response = await this.httpClient.get<any[]>(`/v1/node/${nodeId}/allocations`, {
            params: this.buildQueryParams(options)
        });
        return response.data;
    }

    /**
     * Método de conveniência para obter apenas nodes saudáveis
     */
    async getHealthyNodes(): Promise<INode[]> {
        const allNodes = await this.list();
        return allNodes.data.filter(node => 
            node.Status === 'ready' && 
            node.SchedulingEligibility === 'eligible' &&
            !node.Drain
        );
    }

    /**
     * Método de conveniência para obter nodes por classe
     */
    async getNodesByClass(nodeClass: string): Promise<INode[]> {
        const allNodes = await this.list();
        return allNodes.data.filter(node => node.NodeClass === nodeClass);
    }

    /**
     * Método de conveniência para obter nodes por pool
     */
    async getNodesByPool(nodePool: string): Promise<INode[]> {
        const allNodes = await this.list();
        return allNodes.data.filter(node => node.NodePool === nodePool);
    }

    /**
     * Método de conveniência para verificar se um node está saudável
     */
    async isNodeHealthy(nodeId: string): Promise<boolean> {
        try {
            const node = await this.get(nodeId);
            return node.Status === 'ready' && 
                   node.SchedulingEligibility === 'eligible' && 
                   !node.Drain;
        } catch (error) {
            return false;
        }
    }

    /**
     * Método de conveniência para obter resumo completo de um node
     */
    async getNodeSummary(nodeId: string): Promise<{
        node: INode;
        stats: INodeStats;
        allocations: any[];
        isHealthy: boolean;
        utilizationPercent: {
            cpu: number;
            memory: number;
            disk: number;
        };
    }> {
        const [node, allocations] = await Promise.all([
            this.get(nodeId),
            this.allocations(nodeId)
        ]);

        let stats: INodeStats | null = null;
        let utilizationPercent = { cpu: 0, memory: 0, disk: 0 };

        try {
            stats = await this.stats(nodeId);
            
            // Calcular utilização percentual
            if (node.NodeResources && stats) {
                const totalMemory = node.NodeResources.Memory.MemoryMB;
                const usedMemory = stats.Memory.Used / (1024 * 1024); // Convert bytes to MB
                utilizationPercent.memory = totalMemory > 0 ? (usedMemory / totalMemory) * 100 : 0;

                // CPU utilização (exemplo simples)
                if (stats.CPU && stats.CPU.length > 0) {
                    const avgCpuUsage = stats.CPU.reduce((sum, cpu) => 
                        sum + (100 - cpu.Idle), 0) / stats.CPU.length;
                    utilizationPercent.cpu = avgCpuUsage;
                }

                // Disk utilização
                if (stats.DiskStats && stats.DiskStats.length > 0) {
                    const avgDiskUsage = stats.DiskStats.reduce((sum, disk) => 
                        sum + disk.UsedPercent, 0) / stats.DiskStats.length;
                    utilizationPercent.disk = avgDiskUsage;
                }
            }
        } catch (error) {
            // Stats podem não estar disponíveis
            stats = {} as INodeStats;
        }

        const isHealthy = node.Status === 'ready' && 
                         node.SchedulingEligibility === 'eligible' && 
                         !node.Drain;

        return {
            node,
            stats: stats!,
            allocations,
            isHealthy,
            utilizationPercent
        };
    }

    /**
     * Método de conveniência para fazer drain seguro de um node
     */
    async drainSafely(
        nodeId: string, 
        deadlineMinutes: number = 30,
        ignoreSystemJobs: boolean = false
    ): Promise<IWriteResponse> {
        const deadlineNanos = deadlineMinutes * 60 * 1000 * 1000 * 1000; // Convert to nanoseconds

        return await this.drain(nodeId, {
            DrainSpec: {
                Deadline: deadlineNanos,
                IgnoreSystemJobs: ignoreSystemJobs
            },
            MarkEligible: false
        });
    }

    /**
     * Método de conveniência para cancelar drain de um node
     */
    async cancelDrain(nodeId: string): Promise<IWriteResponse> {
        return await this.drain(nodeId, {
            DrainSpec: undefined,
            MarkEligible: true
        });
    }

    /**
     * Método de conveniência para marcar node como ineligível temporariamente
     */
    async markIneligible(nodeId: string): Promise<IWriteResponse> {
        return await this.eligibility(nodeId, 'ineligible');
    }

    /**
     * Método de conveniência para marcar node como elegível
     */
    async markEligible(nodeId: string): Promise<IWriteResponse> {
        return await this.eligibility(nodeId, 'eligible');
    }

    /**
     * Método de conveniência para obter estatísticas de todos os nodes
     */
    async getClusterStats(): Promise<{
        totalNodes: number;
        healthyNodes: number;
        drainingNodes: number;
        ineligibleNodes: number;
        downNodes: number;
        nodesByClass: Record<string, number>;
        nodesByPool: Record<string, number>;
    }> {
        const nodes = await this.list();
        
        const stats = {
            totalNodes: nodes.data.length,
            healthyNodes: 0,
            drainingNodes: 0,
            ineligibleNodes: 0,
            downNodes: 0,
            nodesByClass: {} as Record<string, number>,
            nodesByPool: {} as Record<string, number>
        };

        nodes.data.forEach(node => {
            // Contagem por status
            if (node.Status === 'ready' && node.SchedulingEligibility === 'eligible' && !node.Drain) {
                stats.healthyNodes++;
            }
            if (node.Drain) {
                stats.drainingNodes++;
            }
            if (node.SchedulingEligibility === 'ineligible') {
                stats.ineligibleNodes++;
            }
            if (node.Status === 'down' || node.Status === 'disconnected') {
                stats.downNodes++;
            }

            // Contagem por classe
            const nodeClass = node.NodeClass || 'default';
            stats.nodesByClass[nodeClass] = (stats.nodesByClass[nodeClass] || 0) + 1;

            // Contagem por pool
            const nodePool = node.NodePool || 'default';
            stats.nodesByPool[nodePool] = (stats.nodesByPool[nodePool] || 0) + 1;
        });

        return stats;
    }

    /**
     * Método utilitário para construir parâmetros de query
     */
    private buildQueryParams(options: IQueryOptions): Record<string, string> {
        const params: Record<string, string> = {};

        if (options.region) params.region = options.region;
        if (options.namespace) params.namespace = options.namespace;
        if (options.index !== undefined) params.index = options.index.toString();
        if (options.wait) params.wait = options.wait;
        if (options.stale !== undefined) params.stale = options.stale.toString();
        if (options.prefix) params.prefix = options.prefix;
        if (options['per-page']) params['per-page'] = options['per-page'].toString();
        if (options['next-token']) params['next-token'] = options['next-token'];
        
        // Opções específicas de nodes
        if ('resources' in options && options.resources) {
            params.resources = 'true';
        }

        return params;
    }
}