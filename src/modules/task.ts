import { IHttpClient } from '../core/http';
import { IQueryOptions, TaskState, ITaskLogs } from '../types/nomad';
import { ITask } from '../types/job';

/**
 * Interfaces for Tasks
 */
export interface ITaskInfo extends ITask {
    AllocationID: string;
    JobID: string;
    TaskGroupName: string;
}

export interface ITaskEvent {
    Type: string;
    Time: number;
    Message: string;
    DisplayMessage: string;
    Details: Record<string, string>;
    FailsTask: boolean;
    RestartReason: string;
    SetupError: string;
    DriverError: string;
    ExitCode: number;
    Signal: number;
    KillReason: string;
    KillTimeout: number;
    KillError: string;
}

export interface ITaskStats {
    Pids: Record<string, number>;
    ResourceUsage: {
        CPU: {
            SystemMode: number;
            UserMode: number;
            TotalTicks: number;
            ThrottledPeriods: number;
            ThrottledTime: number;
            Percent: number;
        };
        Memory: {
            RSS: number;
            Cache: number;
            Swap: number;
            Usage: number;
            MaxUsage: number;
            KernelUsage: number;
            KernelMaxUsage: number;
        };
    };
    Timestamp: number;
}

/**
 * Interface for Tasks module
 */
export interface INomadTaskModule {
    getLogs(allocId: string, taskName: string, logType?: 'stdout' | 'stderr'): Promise<ITaskLogs>;
    getStats(allocId: string, taskName: string): Promise<ITaskStats>;
    signal(allocId: string, taskName: string, signal: string): Promise<void>;
    exec(allocId: string, taskName: string, command: string[]): Promise<any>;
    restart(allocId: string, taskName: string): Promise<void>;
    getEvents(allocId: string, taskName: string): Promise<ITaskEvent[]>;
}

/**
 * Implementation of Nomad Tasks module
 */
export class NomadTaskModule implements INomadTaskModule {
    constructor(private httpClient: IHttpClient) {}

    /**
     * Obtém logs de uma task
     */
    async getLogs(
        allocId: string, 
        taskName: string, 
        logType?: 'stdout' | 'stderr'
    ): Promise<ITaskLogs> {
        if (logType === 'stderr') {
            const stderr = await this.fetchLogs(allocId, taskName, 'stderr');
            return {
                stdout: '',
                stderr: stderr,
                exitCode: undefined
            };
        } else if (logType === 'stdout') {
            const stdout = await this.fetchLogs(allocId, taskName, 'stdout');
            return {
                stdout: stdout,
                stderr: '',
                exitCode: undefined
            };
        } else {
            // When no logType specified, fetch both stdout and stderr
            const [stdout, stderr] = await Promise.all([
                this.fetchLogs(allocId, taskName, 'stdout'),
                this.fetchLogs(allocId, taskName, 'stderr')
            ]);
            return {
                stdout: stdout,
                stderr: stderr,
                exitCode: undefined
            };
        }
    }

    /**
     * Obtém estatísticas de recursos de uma task
     */
    async getStats(allocId: string, taskName: string): Promise<ITaskStats> {
        const response = await this.httpClient.get<{ Tasks: Record<string, ITaskStats> }>(
            `/v1/client/allocation/${allocId}/stats`
        );

        const taskStats = response.data.Tasks[taskName];
        if (!taskStats) {
            throw new Error(`Task ${taskName} not found in allocation ${allocId}`);
        }

        return taskStats;
    }

    /**
     * Envia sinal para uma task
     */
    async signal(allocId: string, taskName: string, signal: string): Promise<void> {
        const payload = {
            Task: taskName,
            Signal: signal
        };

        await this.httpClient.post(`/v1/client/allocation/${allocId}/signal`, payload);
    }

    /**
     * Executa comando em uma task
     */
    async exec(allocId: string, taskName: string, command: string[]): Promise<any> {
        const payload = {
            Task: taskName,
            Command: command,
            Tty: false
        };

        const response = await this.httpClient.post<any>(
            `/v1/client/allocation/${allocId}/exec`,
            payload
        );

        return response.data;
    }

    /**
     * Reinicia uma task específica
     */
    async restart(allocId: string, taskName: string): Promise<void> {
        const payload = {
            TaskName: taskName
        };

        await this.httpClient.post(`/v1/client/allocation/${allocId}/restart`, payload);
    }

    /**
     * Obtém eventos de uma task
     */
    async getEvents(allocId: string, taskName: string): Promise<ITaskEvent[]> {
        const response = await this.httpClient.get<any>(`/v1/allocation/${allocId}`);
        
        const taskState = response.data.TaskStates?.[taskName];
        if (!taskState) {
            throw new Error(`Task ${taskName} not found in allocation ${allocId}`);
        }

        return taskState.Events || [];
    }

    /**
     * Monitora logs em tempo real
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
                    const params = {
                        task: taskName,
                        type: logType,
                        offset: offset.toString(),
                        origin: 'start'
                    };

                    const response = await this.httpClient.get<any>(
                        `/v1/client/allocation/${allocId}/logs`,
                        { params }
                    );

                    if (response.data && response.data.Data) {
                        const logData = Buffer.from(response.data.Data, 'base64').toString('utf-8');
                        if (logData && logData.length > 0) {
                            onData(logData);
                        }
                        offset = response.data.Offset || offset;
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
     * Verifica se uma task está rodando
     */
    async isRunning(allocId: string, taskName: string): Promise<boolean> {
        try {
            const response = await this.httpClient.get<any>(`/v1/allocation/${allocId}`);
            const taskState = response.data.TaskStates?.[taskName];
            
            return taskState?.State === 'running' && !taskState?.Failed;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtém status detalhado de uma task
     */
    async getStatus(allocId: string, taskName: string): Promise<{
        state: TaskState;
        failed: boolean;
        restarts: number;
        events: ITaskEvent[];
        startedAt?: string;
        finishedAt?: string;
    }> {
        const response = await this.httpClient.get<any>(`/v1/allocation/${allocId}`);
        const taskState = response.data.TaskStates?.[taskName];

        if (!taskState) {
            throw new Error(`Task ${taskName} not found in allocation ${allocId}`);
        }

        return {
            state: taskState.State,
            failed: taskState.Failed,
            restarts: taskState.Restarts || 0,
            events: taskState.Events || [],
            startedAt: taskState.StartedAt,
            finishedAt: taskState.FinishedAt
        };
    }

    /**
     * Aguarda até que uma task atinja um estado específico
     */
    async waitForState(
        allocId: string,
        taskName: string,
        desiredState: TaskState,
        timeoutMs: number = 300000
    ): Promise<boolean> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            try {
                const status = await this.getStatus(allocId, taskName);
                
                if (status.state === desiredState) {
                    return true;
                }

                // Se chegou a um estado terminal diferente, para
                if (status.state === 'dead') {
                    return desiredState === 'dead';
                }

                // Aguarda antes da próxima verificação
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                break;
            }
        }

        return false;
    }

    /**
     * Método privado para buscar logs
     */
    private async fetchLogs(
        allocId: string, 
        taskName: string, 
        logType: 'stdout' | 'stderr'
    ): Promise<string> {
        const params = {
            task: taskName,
            type: logType
        };

        const response = await this.httpClient.get<any>(
            `/v1/client/allocation/${allocId}/logs`,
            { params }
        );

        if (typeof response.data === 'object' && response.data.Data) {
            return Buffer.from(response.data.Data, 'base64').toString('utf-8');
        }
        
        return response.data || '';
    }
}