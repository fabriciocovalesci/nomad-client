import { IHttpClient } from '../core/http';
import { IQueryOptions, IListResponse, IWriteResponse } from '../types/nomad';

/**
 * Interfaces para Namespaces
 */
export interface INamespace {
    Name: string;
    Description: string;
    Quota?: string;
    Meta?: Record<string, string>;
    Capabilities?: INamespaceCapabilities;
    CreateIndex: number;
    ModifyIndex: number;
}

export interface INamespaceCapabilities {
    EnabledTaskDrivers?: string[];
    DisabledTaskDrivers?: string[];
    [key: string]: any;
}

export interface INamespaceListOptions extends IQueryOptions {
    prefix?: string;
}

export interface INamespaceSpec {
    Name: string;
    Description?: string;
    Quota?: string;
    Meta?: Record<string, string>;
    Capabilities?: INamespaceCapabilities;
}

/**
 * Interface para o módulo de Namespaces
 */
export interface INomadNamespaceModule {
    list(options?: INamespaceListOptions): Promise<IListResponse<INamespace>>;
    get(namespaceName: string): Promise<INamespace>;
    create(namespace: INamespaceSpec): Promise<IWriteResponse>;
    update(namespace: INamespaceSpec): Promise<IWriteResponse>;
    delete(namespaceName: string): Promise<IWriteResponse>;
}

/**
 * Implementação do módulo de Namespaces do Nomad
 */
export class NomadNamespaceModule implements INomadNamespaceModule {
    constructor(private httpClient: IHttpClient) {}

    /**
     * Lista todos os namespaces
     */
    async list(options: INamespaceListOptions = {}): Promise<IListResponse<INamespace>> {
        const response = await this.httpClient.get<INamespace[]>('/v1/namespaces', {
            params: this.buildQueryParams(options)
        });

        return {
            data: response.data,
            nextToken: response.headers['X-Nomad-NextToken']
        };
    }

    /**
     * Obtém detalhes de um namespace específico
     */
    async get(namespaceName: string): Promise<INamespace> {
        const response = await this.httpClient.get<INamespace>(`/v1/namespace/${namespaceName}`);
        return response.data;
    }

    /**
     * Cria um novo namespace
     */
    async create(namespace: INamespaceSpec): Promise<IWriteResponse> {
        const response = await this.httpClient.post<IWriteResponse>('/v1/namespaces', namespace);
        return response.data;
    }

    /**
     * Atualiza um namespace existente
     */
    async update(namespace: INamespaceSpec): Promise<IWriteResponse> {
        const response = await this.httpClient.post<IWriteResponse>(`/v1/namespace/${namespace.Name}`, namespace);
        return response.data;
    }

    /**
     * Deleta um namespace
     */
    async delete(namespaceName: string): Promise<IWriteResponse> {
        const response = await this.httpClient.delete<IWriteResponse>(`/v1/namespace/${namespaceName}`);
        return response.data;
    }

    /**
     * Verifica se um namespace existe
     */
    async exists(namespaceName: string): Promise<boolean> {
        try {
            await this.get(namespaceName);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Cria namespace se não existir
     */
    async createIfNotExists(namespace: INamespaceSpec): Promise<IWriteResponse | null> {
        const exists = await this.exists(namespace.Name);
        
        if (!exists) {
            return await this.create(namespace);
        }
        
        return null;
    }

    /**
     * Lista jobs de um namespace específico
     */
    async getJobs(namespaceName: string): Promise<any[]> {
        const response = await this.httpClient.get<any[]>('/v1/jobs', {
            params: { namespace: namespaceName }
        });
        return response.data;
    }

    /**
     * Lista allocations de um namespace específico
     */
    async getAllocations(namespaceName: string): Promise<any[]> {
        const response = await this.httpClient.get<any[]>('/v1/allocations', {
            params: { namespace: namespaceName }
        });
        return response.data;
    }

    /**
     * Obtém estatísticas de uso de um namespace
     */
    async getUsageStats(namespaceName: string): Promise<{
        jobs: { total: number; running: number; pending: number; dead: number };
        allocations: { total: number; running: number; pending: number; complete: number; failed: number };
    }> {
        const [jobs, allocations] = await Promise.all([
            this.getJobs(namespaceName),
            this.getAllocations(namespaceName)
        ]);

        const jobStats = jobs.reduce(
            (acc, job) => {
                acc.total++;
                switch (job.Status) {
                    case 'running':
                        acc.running++;
                        break;
                    case 'pending':
                        acc.pending++;
                        break;
                    case 'dead':
                        acc.dead++;
                        break;
                }
                return acc;
            },
            { total: 0, running: 0, pending: 0, dead: 0 }
        );

        const allocStats = allocations.reduce(
            (acc, alloc) => {
                acc.total++;
                switch (alloc.ClientStatus) {
                    case 'running':
                        acc.running++;
                        break;
                    case 'pending':
                        acc.pending++;
                        break;
                    case 'complete':
                        acc.complete++;
                        break;
                    case 'failed':
                        acc.failed++;
                        break;
                }
                return acc;
            },
            { total: 0, running: 0, pending: 0, complete: 0, failed: 0 }
        );

        return {
            jobs: jobStats,
            allocations: allocStats
        };
    }

    /**
     * Método utilitário para construir parâmetros de query
     */
    private buildQueryParams(options: INamespaceListOptions): Record<string, string> {
        const params: Record<string, string> = {};

        if (options.region) params.region = options.region;
        if (options.index !== undefined) params.index = options.index.toString();
        if (options.wait) params.wait = options.wait;
        if (options.stale !== undefined) params.stale = options.stale.toString();
        if (options.prefix) params.prefix = options.prefix;
        if (options['per-page']) params['per-page'] = options['per-page'].toString();
        if (options['next-token']) params['next-token'] = options['next-token'];

        return params;
    }
}