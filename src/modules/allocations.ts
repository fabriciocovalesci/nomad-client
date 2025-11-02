import { IHttpClient } from '../core/http';
import { 
    IQueryOptions, 
    IListResponse, 
    IWriteResponse,
    AllocationStatus,
    TaskState,
    IAllocationEvent,
    IResourceUsage,
    INetworkResource
} from '../types/nomad';
import { IAllocationMetric } from '../types/job';

/**
 * Interfaces for Allocations based on official Nomad API
 * Reference: https://developer.hashicorp.com/nomad/api-docs/allocations
 */
export interface IAllocation {
    ID: string;
    Namespace: string;
    EvalID: string;
    Name: string;
    NodeID: string;
    NodeName: string;
    JobID: string;
    Job: IAllocationJob;
    TaskGroup: string;
    Resources: IAllocatedResources;
    TaskResources: Record<string, IAllocatedTaskResources>;
    AllocatedResources: IAllocatedSharedResources;
    Services: Record<string, string>;
    Metrics: IAllocationMetric;
    DesiredStatus: AllocationStatus;
    DesiredDescription: string;
    DesiredTransition: IDesiredTransition;
    ClientStatus: AllocationStatus;
    ClientDescription: string;
    TaskStates: Record<string, ITaskState>;
    AllocModifyIndex: number;
    CreateIndex: number;
    ModifyIndex: number;
    CreateTime: number;
    ModifyTime: number;
    DeploymentID?: string;
    DeploymentStatus?: IAllocationDeploymentStatus;
    FollowupEvalID?: string;
    NextAllocation?: string;
    PreviousAllocation?: string;
    PreemptedAllocations?: string[];
    PreemptedByAllocation?: string;
    RescheduleTracker?: IRescheduleTracker;
}

export interface IAllocationJob {
    ID: string;
    Name: string;
    Type: string;
    Priority: number;
    AllAtOnce: boolean;
    Datacenters: string[];
    Namespace: string;
    Status: string;
    StatusDescription: string;
    Version: number;
    CreateIndex: number;
    ModifyIndex: number;
    JobModifyIndex: number;
}

export interface IAllocatedResources {
    CPU: number;
    MemoryMB: number;
    DiskMB: number;
    IOPS: number;
    Networks: INetworkResource[];
}

export interface IAllocatedTaskResources {
    CPU: number;
    MemoryMB: number;
    DiskMB: number;
    IOPS: number;
    Networks: INetworkResource[];
}

export interface IAllocatedSharedResources {
    Tasks: Record<string, IAllocatedTaskResources>;
    Shared: IAllocatedResources;
}

export interface IPortMapping {
    Label: string;
    Value: number;
    To?: number;
    HostNetwork?: string;
}

export interface ITaskState {
    State: TaskState;
    Failed: boolean;
    Restarts: number;
    LastRestart: number;
    StartedAt: string;
    FinishedAt: string;
    Events: IAllocationEvent[];
}

export interface IAllocationDeploymentStatus {
    Healthy?: boolean;
    Timestamp: number;
    Canary: boolean;
    ModifyIndex: number;
}

export interface IDesiredTransition {
    Migrate?: boolean;
    Reschedule?: boolean;
    ForceReschedule?: boolean;
}

export interface IRescheduleTracker {
    Events: IRescheduleEvent[];
}

export interface IRescheduleEvent {
    RescheduleTime: number;
    PrevAllocID: string;
    PrevNodeID: string;
    Delay: number;
}

export interface IAllocationListOptions extends IQueryOptions {
    job?: string;
    node?: string;
    resources?: boolean;
}

export interface IAllocationStats {
    ResourceUsage: IResourceUsage;
    Tasks: Record<string, ITaskResourceUsage>;
    Timestamp: number;
}

export interface ITaskResourceUsage {
    ResourceUsage: IResourceUsage;
    Timestamp: number;
    Pids?: Record<string, number>;
}

export interface IAllocationLogRequest {
    task: string;
    type?: 'stdout' | 'stderr';
    origin?: 'start' | 'end';
    offset?: number;
    follow?: boolean;
    plain?: boolean;
}

export interface IAllocationLogResponse {
    Data: string; // Base64 encoded
    Offset: number;
    File: string;
}

export interface IAllocationExecRequest {
    Task: string;
    Command: string[];
    Tty: boolean;
}

export interface IAllocationSignalRequest {
    Task: string;
    Signal: string;
}

export interface IAllocationRestartRequest {
    TaskName?: string;
    AllTasks?: boolean;
}

/**
 * Interface for Allocations module
 */
export interface INomadAllocationModule {
    list(options?: IAllocationListOptions): Promise<IListResponse<IAllocation>>;
    get(allocId: string): Promise<IAllocation>;
    stop(allocId: string): Promise<IWriteResponse>;
    restart(allocId: string, options?: IAllocationRestartRequest): Promise<IWriteResponse>;
    stats(allocId: string): Promise<IAllocationStats>;
    logs(allocId: string, request: IAllocationLogRequest): Promise<IAllocationLogResponse>;
    exec(allocId: string, request: IAllocationExecRequest): Promise<any>;
    signal(allocId: string, request: IAllocationSignalRequest): Promise<IWriteResponse>;
    services(allocId: string): Promise<any[]>;

    // Métodos de conveniência
    getSimpleLogs(allocId: string, taskName: string, logType?: 'stdout' | 'stderr', follow?: boolean): Promise<string>;
    streamLogs(allocId: string, taskName: string, logType?: 'stdout' | 'stderr', onData?: (data: string) => void, onError?: (error: Error) => void): Promise<() => void>;
    executeCommand(allocId: string, taskName: string, command: string[]): Promise<string>;
    isHealthy(allocId: string): Promise<boolean>;
    waitForStatus(allocId: string, desiredStatus: AllocationStatus, timeoutMs?: number): Promise<boolean>;
    getSummary(allocId: string): Promise<{
        id: string;
        name: string;
        status: AllocationStatus;
        jobId: string;
        nodeId: string;
        taskGroup: string;
        tasks: Array<{
            name: string;
            state: TaskState;
            failed: boolean;
            restarts: number;
        }>;
        createdAt: Date;
        modifiedAt: Date;
    }>;
    getFormattedStats(allocId: string): Promise<{
        cpu: { percent: number; total: number };
        memory: { used: number; total: number; percent: number };
        tasks: Record<string, {
            cpu: { percent: number };
            memory: { used: number; percent: number };
        }>;
    }>;
}

/**
 * Complete implementation of Nomad Allocations module
 * Baseado na documentação oficial: https://developer.hashicorp.com/nomad/api-docs/allocations
 */
export class NomadAllocationModule implements INomadAllocationModule {
    constructor(private httpClient: IHttpClient) {}

    /**
     * Lista todas as allocations
     * GET /v1/allocations
     */
    async list(options: IAllocationListOptions = {}): Promise<IListResponse<IAllocation>> {
        const response = await this.httpClient.get<IAllocation[]>('/v1/allocations', {
            params: this.buildQueryParams(options)
        });

        return {
            data: response.data,
            nextToken: response.headers['X-Nomad-NextToken']
        };
    }

    /**
     * Obtém informações detalhadas de uma allocation específica
     * GET /v1/allocation/:allocID
     */
    async get(allocId: string): Promise<IAllocation> {
        const response = await this.httpClient.get<IAllocation>(`/v1/allocation/${allocId}`);
        return response.data;
    }

    /**
     * Para uma allocation específica
     * POST /v1/allocation/:allocID/stop
     */
    async stop(allocId: string): Promise<IWriteResponse> {
        const response = await this.httpClient.post<IWriteResponse>(`/v1/allocation/${allocId}/stop`);
        return response.data;
    }

    /**
     * Reinicia uma allocation ou tasks específicas
     * POST /v1/client/allocation/:allocID/restart
     */
    async restart(allocId: string, options: IAllocationRestartRequest = {}): Promise<IWriteResponse> {
        const response = await this.httpClient.post<IWriteResponse>(
            `/v1/client/allocation/${allocId}/restart`,
            options
        );
        return response.data;
    }

    /**
     * Obtém estatísticas de recursos de uma allocation
     * GET /v1/client/allocation/:allocID/stats
     */
    async stats(allocId: string): Promise<IAllocationStats> {
        const response = await this.httpClient.get<IAllocationStats>(`/v1/client/allocation/${allocId}/stats`);
        return response.data;
    }

    /**
     * Obtém logs de uma task específica dentro da allocation
     * GET /v1/client/allocation/:allocID/logs
     */
    async logs(allocId: string, request: IAllocationLogRequest): Promise<IAllocationLogResponse> {
        const params: Record<string, string> = {
            task: request.task
        };

        if (request.type) params.type = request.type;
        if (request.origin) params.origin = request.origin;
        if (request.offset !== undefined) params.offset = request.offset.toString();
        if (request.follow !== undefined) params.follow = request.follow.toString();
        if (request.plain !== undefined) params.plain = request.plain.toString();

        const response = await this.httpClient.get<IAllocationLogResponse>(
            `/v1/client/allocation/${allocId}/logs`,
            { params }
        );

        return response.data;
    }

    /**
     * Executa um comando dentro de uma task da allocation
     * POST /v1/client/allocation/:allocID/exec
     */
    async exec(allocId: string, request: IAllocationExecRequest): Promise<any> {
        const response = await this.httpClient.post<any>(
            `/v1/client/allocation/${allocId}/exec`,
            request
        );
        return response.data;
    }

    /**
     * Envia um sinal para uma task específica
     * POST /v1/client/allocation/:allocID/signal
     */
    async signal(allocId: string, request: IAllocationSignalRequest): Promise<IWriteResponse> {
        const response = await this.httpClient.post<IWriteResponse>(
            `/v1/client/allocation/${allocId}/signal`,
            request
        );
        return response.data;
    }

    /**
     * Lista serviços registrados por uma allocation
     * GET /v1/allocation/:allocID/services
     */
    async services(allocId: string): Promise<any[]> {
        const response = await this.httpClient.get<any[]>(`/v1/allocation/${allocId}/services`);
        return response.data;
    }

    /**
     * Métodos de conveniência adicionais
     */

    /**
     * Obtém logs simplificados (stdout/stderr)
     */
    async getSimpleLogs(
        allocId: string, 
        taskName: string, 
        logType: 'stdout' | 'stderr' = 'stdout',
        follow: boolean = false
    ): Promise<string> {
        const logResponse = await this.logs(allocId, {
            task: taskName,
            type: logType,
            follow,
            plain: true
        });

        // Decodifica base64 para string
        return Buffer.from(logResponse.Data, 'base64').toString('utf-8');
    }

    /**
     * Stream de logs em tempo real
     */
    async streamLogs(
        allocId: string,
        taskName: string,
        logType: 'stdout' | 'stderr' = 'stdout',
        onData: (data: string) => void,
        onError?: (error: Error) => void
    ): Promise<() => void> {
        let running = true;
        let offset = 0;

        const stopStreaming = () => {
            running = false;
        };

        const streamLoop = async () => {
            while (running) {
                try {
                    const logResponse = await this.logs(allocId, {
                        task: taskName,
                        type: logType,
                        origin: 'start',
                        offset,
                        follow: false
                    });

                    if (logResponse.Data) {
                        const logData = Buffer.from(logResponse.Data, 'base64').toString('utf-8');
                        if (logData && logData.length > 0) {
                            onData(logData);
                        }
                        offset = logResponse.Offset;
                    }

                    // Aguarda antes da próxima verificação
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    if (onError && running) {
                        onError(error instanceof Error ? error : new Error('Stream error'));
                    }
                    break;
                }
            }
        };

        // Inicia o streaming
        streamLoop();

        // Retorna função para parar o streaming
        return stopStreaming;
    }

    /**
     * Executa comando simples e retorna resultado
     */
    async executeCommand(allocId: string, taskName: string, command: string[]): Promise<string> {
        const result = await this.exec(allocId, {
            Task: taskName,
            Command: command,
            Tty: false
        });

        // Processa resultado baseado na resposta da API
        if (result && result.stdout) {
            return Buffer.from(result.stdout, 'base64').toString('utf-8');
        }

        return '';
    }

    /**
     * Verifica se uma allocation está saudável
     */
    async isHealthy(allocId: string): Promise<boolean> {
        try {
            const allocation = await this.get(allocId);
            
            // Verifica status geral
            if (allocation.ClientStatus !== 'running') {
                return false;
            }

            // Verifica se há deployment status
            if (allocation.DeploymentStatus) {
                return allocation.DeploymentStatus.Healthy === true;
            }

            // Verifica tasks individuais
            const taskStates = Object.values(allocation.TaskStates || {});
            return taskStates.every(task => task.State === 'running' && !task.Failed);
            
        } catch (error) {
            return false;
        }
    }

    /**
     * Aguarda até que a allocation atinja um status específico
     */
    async waitForStatus(
        allocId: string, 
        desiredStatus: AllocationStatus, 
        timeoutMs: number = 300000
    ): Promise<boolean> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            try {
                const allocation = await this.get(allocId);
                
                if (allocation.ClientStatus === desiredStatus) {
                    return true;
                }

                // Se chegou a um status terminal diferente, para
                const terminalStatuses = ['complete', 'failed', 'lost'];
                if (terminalStatuses.includes(allocation.ClientStatus)) {
                    return allocation.ClientStatus === desiredStatus;
                }

                // Aguarda antes da próxima verificação
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                // Se a allocation não existe mais, pode ter sido completada/removida
                if (desiredStatus === 'complete') {
                    return true;
                }
                break;
            }
        }

        return false;
    }

    /**
     * Obtém informações resumidas de uma allocation
     */
    async getSummary(allocId: string): Promise<{
        id: string;
        name: string;
        status: AllocationStatus;
        jobId: string;
        nodeId: string;
        taskGroup: string;
        tasks: Array<{
            name: string;
            state: TaskState;
            failed: boolean;
            restarts: number;
        }>;
        createdAt: Date;
        modifiedAt: Date;
    }> {
        const allocation = await this.get(allocId);

        const tasks = Object.entries(allocation.TaskStates || {}).map(([name, state]) => ({
            name,
            state: state.State,
            failed: state.Failed,
            restarts: state.Restarts
        }));

        return {
            id: allocation.ID,
            name: allocation.Name,
            status: allocation.ClientStatus,
            jobId: allocation.JobID,
            nodeId: allocation.NodeID,
            taskGroup: allocation.TaskGroup,
            tasks,
            createdAt: new Date(allocation.CreateTime / 1000000), // Convert from nanoseconds
            modifiedAt: new Date(allocation.ModifyTime / 1000000)
        };
    }

    /**
     * Obtém métricas de recursos formatadas
     */
    async getFormattedStats(allocId: string): Promise<{
        cpu: { percent: number; total: number };
        memory: { used: number; total: number; percent: number };
        tasks: Record<string, {
            cpu: { percent: number };
            memory: { used: number; percent: number };
        }>;
    }> {
        const stats = await this.stats(allocId);

        const result: any = {
            cpu: {
                percent: stats.ResourceUsage.CPU.Percent,
                total: stats.ResourceUsage.CPU.TotalTicks
            },
            memory: {
                used: Math.round(stats.ResourceUsage.Memory.RSS / 1024 / 1024), // MB
                total: Math.round(stats.ResourceUsage.Memory.Usage / 1024 / 1024), // MB
                percent: (stats.ResourceUsage.Memory.RSS / stats.ResourceUsage.Memory.Usage) * 100
            },
            tasks: {}
        };

        // Adiciona estatísticas por task
        Object.entries(stats.Tasks || {}).forEach(([taskName, taskStats]) => {
            result.tasks[taskName] = {
                cpu: {
                    percent: taskStats.ResourceUsage.CPU.Percent
                },
                memory: {
                    used: Math.round(taskStats.ResourceUsage.Memory.RSS / 1024 / 1024),
                    percent: (taskStats.ResourceUsage.Memory.RSS / taskStats.ResourceUsage.Memory.Usage) * 100
                }
            };
        });

        return result;
    }

    /**
     * Método utilitário para construir parâmetros de query
     */
    private buildQueryParams(options: IAllocationListOptions): Record<string, string> {
        const params: Record<string, string> = {};

        if (options.region) params.region = options.region;
        if (options.namespace) params.namespace = options.namespace;
        if (options.index !== undefined) params.index = options.index.toString();
        if (options.wait) params.wait = options.wait;
        if (options.stale !== undefined) params.stale = options.stale.toString();
        if (options.prefix) params.prefix = options.prefix;
        if (options['per-page']) params['per-page'] = options['per-page'].toString();
        if (options['next-token']) params['next-token'] = options['next-token'];
        if (options.job) params.job = options.job;
        if (options.node) params.node = options.node;
        if (options.resources) params.resources = 'true';

        return params;
    }
}