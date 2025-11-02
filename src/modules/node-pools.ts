import { IHttpClient } from '../core/http';
import { 
    INodePool, 
    INodePoolListOptions,
    INodePoolUpsertRequest,
    INodePoolUpdateRequest,
    INodePoolInfo,
    INodePoolSchedulerConfig
} from '../types/node-pools';
import { IQueryOptions, IListResponse, IWriteResponse } from '../types/nomad';

/**
 * Interface para o módulo de Node Pools
 * Baseada na API oficial: https://developer.hashicorp.com/nomad/api-docs/node-pools
 */
export interface INomadNodePoolModule {
    // Operações básicas CRUD
    list(options?: INodePoolListOptions): Promise<IListResponse<INodePool>>;
    get(nodePoolName: string, options?: IQueryOptions): Promise<INodePool>;
    create(nodePool: INodePool): Promise<IWriteResponse>;
    update(nodePoolName: string, nodePool: Partial<INodePool>): Promise<IWriteResponse>;
    delete(nodePoolName: string): Promise<IWriteResponse>;
    
    // Métodos de conveniência
    getBuiltinPools(): Promise<INodePool[]>;
    createWithScheduler(
        name: string, 
        description: string, 
        schedulerConfig: INodePoolSchedulerConfig,
        meta?: Record<string, string>
    ): Promise<IWriteResponse>;
    getNodesInPool(nodePoolName: string): Promise<any[]>;
    getJobsInPool(nodePoolName: string): Promise<any[]>;
    getPoolUtilization(nodePoolName: string): Promise<{
        pool: INodePool;
        nodesCount: number;
        jobsCount: number;
        allocationsCount: number;
        capacityUtilization: {
            cpu: number;
            memory: number;
        };
    }>;
    createDefaultPool(name: string, description: string, meta?: Record<string, string>): Promise<IWriteResponse>;
    createHAPool(name: string, description: string, meta?: Record<string, string>): Promise<IWriteResponse>;
    createDensePool(name: string, description: string, enableOversubscription?: boolean, meta?: Record<string, string>): Promise<IWriteResponse>;
    getPoolsOverview(): Promise<{
        totalPools: number;
        builtinPools: number;
        customPools: number;
        pools: Array<{
            name: string;
            nodesCount: number;
            schedulerAlgorithm: string;
            memoryOversubscription: boolean;
        }>;
    }>;
}

/**
 * Implementação completa do módulo de Node Pools do Nomad
 * Baseado na documentação oficial: https://developer.hashicorp.com/nomad/api-docs/node-pools
 */
export class NomadNodePoolModule implements INomadNodePoolModule {
    constructor(private httpClient: IHttpClient) {}

    /**
     * Lista todos os node pools
     * GET /v1/node-pools
     */
    async list(options: INodePoolListOptions = {}): Promise<IListResponse<INodePool>> {
        const response = await this.httpClient.get<INodePool[]>('/v1/node-pools', {
            params: this.buildQueryParams(options)
        });

        return {
            data: response.data,
            nextToken: response.headers['X-Nomad-NextToken']
        };
    }

    /**
     * Obtém informações detalhadas de um node pool específico
     * GET /v1/node-pool/:nodePoolName
     */
    async get(nodePoolName: string, options: IQueryOptions = {}): Promise<INodePool> {
        const response = await this.httpClient.get<INodePool>(`/v1/node-pool/${nodePoolName}`, {
            params: this.buildQueryParams(options)
        });
        return response.data;
    }

    /**
     * Cria um novo node pool
     * POST /v1/node-pools
     */
    async create(nodePool: INodePool): Promise<IWriteResponse> {
        const request: INodePoolUpsertRequest = {
            NodePool: nodePool
        };
        
        const response = await this.httpClient.post<IWriteResponse>('/v1/node-pools', request);
        return response.data;
    }

    /**
     * Atualiza um node pool existente
     * POST /v1/node-pool/:nodePoolName
     */
    async update(nodePoolName: string, nodePool: Partial<INodePool>): Promise<IWriteResponse> {
        const request: INodePoolUpdateRequest = {
            NodePool: {
                Name: nodePoolName,
                ...nodePool
            }
        };
        
        const response = await this.httpClient.post<IWriteResponse>(`/v1/node-pool/${nodePoolName}`, request);
        return response.data;
    }

    /**
     * Deleta um node pool
     * DELETE /v1/node-pool/:nodePoolName
     */
    async delete(nodePoolName: string): Promise<IWriteResponse> {
        const response = await this.httpClient.delete<IWriteResponse>(`/v1/node-pool/${nodePoolName}`);
        return response.data;
    }

    /**
     * Método de conveniência para obter apenas pools built-in (default, all)
     */
    async getBuiltinPools(): Promise<INodePool[]> {
        const allPools = await this.list();
        return allPools.data.filter(pool => 
            pool.Name === 'default' || 
            pool.Name === 'all' ||
            pool.Name.startsWith('builtin-')
        );
    }

    /**
     * Método de conveniência para criar node pool com configuração de scheduler
     */
    async createWithScheduler(
        name: string,
        description: string,
        schedulerConfig: INodePoolSchedulerConfig,
        meta?: Record<string, string>
    ): Promise<IWriteResponse> {
        const nodePool: INodePool = {
            Name: name,
            Description: description,
            SchedulerConfiguration: schedulerConfig,
            Meta: meta,
            CreateIndex: 0,
            ModifyIndex: 0
        };

        return await this.create(nodePool);
    }

    /**
     * Método de conveniência para obter nodes em um pool específico
     * Esta funcionalidade usa a API de nodes com filtro
     */
    async getNodesInPool(nodePoolName: string): Promise<any[]> {
        try {
            // Usar a API de nodes com filtro por pool
            const response = await this.httpClient.get<any[]>('/v1/nodes', {
                params: { 
                    filter: `NodePool == "${nodePoolName}"` 
                }
            });
            return response.data;
        } catch (error) {
            // Fallback: obter todos os nodes e filtrar
            const response = await this.httpClient.get<any[]>('/v1/nodes');
            return response.data.filter((node: any) => node.NodePool === nodePoolName);
        }
    }

    /**
     * Método de conveniência para obter jobs que estão usando um pool específico
     */
    async getJobsInPool(nodePoolName: string): Promise<any[]> {
        try {
            // Usar a API de jobs com filtro por node pool
            const response = await this.httpClient.get<any[]>('/v1/jobs', {
                params: {
                    filter: `NodePool == "${nodePoolName}"`
                }
            });
            return response.data;
        } catch (error) {
            // Fallback: obter todos os jobs e filtrar
            const response = await this.httpClient.get<any[]>('/v1/jobs');
            return response.data.filter((job: any) => job.NodePool === nodePoolName);
        }
    }

    /**
     * Método de conveniência para obter utilização de um node pool
     */
    async getPoolUtilization(nodePoolName: string): Promise<{
        pool: INodePool;
        nodesCount: number;
        jobsCount: number;
        allocationsCount: number;
        capacityUtilization: {
            cpu: number;
            memory: number;
        };
    }> {
        const [pool, nodes, jobs] = await Promise.all([
            this.get(nodePoolName),
            this.getNodesInPool(nodePoolName),
            this.getJobsInPool(nodePoolName)
        ]);

        // Contar allocations nos nodes deste pool
        let allocationsCount = 0;
        let totalCpuCapacity = 0;
        let totalMemoryCapacity = 0;
        let usedCpuCapacity = 0;
        let usedMemoryCapacity = 0;

        for (const node of nodes) {
            try {
                // Obter allocations do node
                const allocationsResponse = await this.httpClient.get<any[]>(`/v1/node/${node.ID}/allocations`);
                allocationsCount += allocationsResponse.data.length;

                // Calcular capacidade total
                if (node.NodeResources) {
                    totalCpuCapacity += node.NodeResources.Cpu?.TotalCompute || 0;
                    totalMemoryCapacity += node.NodeResources.Memory?.MemoryMB || 0;
                }

                // Calcular uso atual das allocations
                allocationsResponse.data.forEach((alloc: any) => {
                    if (alloc.ClientStatus === 'running' || alloc.ClientStatus === 'pending') {
                        if (alloc.Resources) {
                            usedCpuCapacity += alloc.Resources.CPU || 0;
                            usedMemoryCapacity += alloc.Resources.MemoryMB || 0;
                        }
                    }
                });
            } catch (error) {
                // Ignorar erros individuais de nodes
            }
        }

        const cpuUtilization = totalCpuCapacity > 0 ? (usedCpuCapacity / totalCpuCapacity) * 100 : 0;
        const memoryUtilization = totalMemoryCapacity > 0 ? (usedMemoryCapacity / totalMemoryCapacity) * 100 : 0;

        return {
            pool,
            nodesCount: nodes.length,
            jobsCount: jobs.length,
            allocationsCount,
            capacityUtilization: {
                cpu: cpuUtilization,
                memory: memoryUtilization
            }
        };
    }

    /**
     * Método de conveniência para criar pool com configuração padrão
     */
    async createDefaultPool(
        name: string,
        description: string,
        meta?: Record<string, string>
    ): Promise<IWriteResponse> {
        return await this.createWithScheduler(
            name,
            description,
            {
                SchedulerAlgorithm: 'binpack',
                MemoryOversubscriptionEnabled: false
            },
            meta
        );
    }

    /**
     * Método de conveniência para criar pool otimizado para alta disponibilidade
     */
    async createHAPool(
        name: string,
        description: string,
        meta?: Record<string, string>
    ): Promise<IWriteResponse> {
        return await this.createWithScheduler(
            name,
            description,
            {
                SchedulerAlgorithm: 'spread',
                MemoryOversubscriptionEnabled: false
            },
            {
                ...meta,
                'pool-type': 'high-availability',
                'scheduler-preference': 'spread'
            }
        );
    }

    /**
     * Método de conveniência para criar pool otimizado para densidade
     */
    async createDensePool(
        name: string,
        description: string,
        enableOversubscription: boolean = true,
        meta?: Record<string, string>
    ): Promise<IWriteResponse> {
        return await this.createWithScheduler(
            name,
            description,
            {
                SchedulerAlgorithm: 'binpack',
                MemoryOversubscriptionEnabled: enableOversubscription
            },
            {
                ...meta,
                'pool-type': 'high-density',
                'scheduler-preference': 'binpack'
            }
        );
    }

    /**
     * Método de conveniência para obter estatísticas de todos os pools
     */
    async getPoolsOverview(): Promise<{
        totalPools: number;
        builtinPools: number;
        customPools: number;
        pools: Array<{
            name: string;
            nodesCount: number;
            schedulerAlgorithm: string;
            memoryOversubscription: boolean;
        }>;
    }> {
        const allPools = await this.list();
        const builtinPools = allPools.data.filter(pool => 
            pool.Name === 'default' || pool.Name === 'all' || pool.Name.startsWith('builtin-')
        );

        const poolStats = [];
        
        for (const pool of allPools.data) {
            try {
                const nodes = await this.getNodesInPool(pool.Name);
                poolStats.push({
                    name: pool.Name,
                    nodesCount: nodes.length,
                    schedulerAlgorithm: pool.SchedulerConfiguration?.SchedulerAlgorithm || 'binpack',
                    memoryOversubscription: pool.SchedulerConfiguration?.MemoryOversubscriptionEnabled || false
                });
            } catch (error) {
                poolStats.push({
                    name: pool.Name,
                    nodesCount: 0,
                    schedulerAlgorithm: pool.SchedulerConfiguration?.SchedulerAlgorithm || 'binpack',
                    memoryOversubscription: pool.SchedulerConfiguration?.MemoryOversubscriptionEnabled || false
                });
            }
        }

        return {
            totalPools: allPools.data.length,
            builtinPools: builtinPools.length,
            customPools: allPools.data.length - builtinPools.length,
            pools: poolStats
        };
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

        return params;
    }
}