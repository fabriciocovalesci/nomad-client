import { IHttpClient } from '../core/http';
import { 
    IJobSpec, 
    IJobListOptions, 
    IJobSummary, 
    IJobVersion,
    IJobPlan,
    IEvaluation
} from '../types/job';
import { IQueryOptions, IListResponse, IWriteResponse } from '../types/nomad';

/**
 * Interfaces for new API endpoints
 */
export interface IJobParseRequest {
    JobHCL?: string;
    Canonicalize?: boolean;
}

export interface IJobParseResponse {
    Job: IJobSpec;
    Warnings?: string[];
}

export interface IJobValidateRequest {
    Job: IJobSpec;
}

export interface IJobValidateResponse {
    Error?: string;
    Warnings?: string[];
    ValidationErrors?: Array<{
        Message: string;
        Context?: string;
    }>;
}

export interface IJobPeriodicInfo {
    Enabled: boolean;
    Spec: string;
    SpecType: string;
    ProhibitOverlap: boolean;
    TimeZone: string;
    Location: {
        Name: string;
        Offset: number;
    };
}

/**
 * Interface for Jobs module
 */
export interface INomadJobModule {
    list(options?: IJobListOptions): Promise<IListResponse<IJobSpec>>;
    get(jobId: string, options?: IQueryOptions): Promise<IJobSpec>;
    create(job: IJobSpec): Promise<IWriteResponse>;
    update(job: IJobSpec): Promise<IWriteResponse>;
    delete(jobId: string, purge?: boolean): Promise<IWriteResponse>;
    plan(job: IJobSpec): Promise<IJobPlan>;
    dispatch(jobId: string, payload?: any, meta?: Record<string, string>): Promise<IWriteResponse>;
    revert(jobId: string, version: number, enforcePriorVersion?: number): Promise<IWriteResponse>;
    stable(jobId: string, version: number): Promise<IWriteResponse>;
    summary(jobId: string): Promise<IJobSummary>;
    versions(jobId: string, diffs?: boolean): Promise<IJobVersion[]>;
    evaluations(jobId: string): Promise<IEvaluation[]>;
    allocations(jobId: string): Promise<any[]>;
    deployments(jobId: string): Promise<any[]>;
    scale(jobId: string, taskGroup: string, count: number): Promise<IWriteResponse>;
    stop(jobId: string, purge?: boolean): Promise<IWriteResponse>;
    restart(jobId: string, taskGroup?: string, allTasks?: boolean): Promise<IWriteResponse>;

    // New official API endpoints
    parse(request: IJobParseRequest): Promise<IJobParseResponse>;
    validate(request: IJobValidateRequest): Promise<IJobValidateResponse>;
    periodicForce(jobId: string): Promise<IWriteResponse>;
    periodicInfo(jobId: string): Promise<IJobPeriodicInfo>;

    // Convenience methods
    parseAndValidateHCL(hclContent: string, canonicalize?: boolean): Promise<{
        job: IJobSpec;
        warnings: string[];
        validationErrors: string[];
        isValid: boolean;
    }>;
    getJobInfo(jobId: string): Promise<{
        job: IJobSpec;
        summary: IJobSummary;
        versions: IJobVersion[];
        allocations: any[];
        deployments: any[];
        evaluations: IEvaluation[];
        periodicInfo?: IJobPeriodicInfo;
    }>;
    isHealthy(jobId: string): Promise<{
        isHealthy: boolean;
        status: string;
        runningAllocations: number;
        totalAllocations: number;
        details: {
            running: number;
            pending: number;
            complete: number;
            failed: number;
            lost: number;
        };
    }>;
}

/**
 * Complete implementation of Nomad Jobs module
 * Following SOLID principles and design patterns
 */
export class NomadJobModule implements INomadJobModule {
    constructor(private httpClient: IHttpClient) {}

    /**
     * Lists all jobs
     */
    async list(options: IJobListOptions = {}): Promise<IListResponse<IJobSpec>> {
        const response = await this.httpClient.get<IJobSpec[]>('/v1/jobs', {
            params: this.buildQueryParams(options)
        });

        return {
            data: response.data,
            nextToken: response.headers['X-Nomad-NextToken'],
            totalCount: parseInt(response.headers['X-Nomad-KnownLeader'] || '0')
        };
    }

    /**
     * Gets details of a specific job
     */
    async get(jobId: string, options: IQueryOptions = {}): Promise<IJobSpec> {
        const response = await this.httpClient.get<IJobSpec>(`/v1/job/${jobId}`, {
            params: this.buildQueryParams(options)
        });

        return response.data;
    }

    /**
     * Creates a new job
     */
    async create(job: IJobSpec): Promise<IWriteResponse> {
        const payload = { Job: job };
        const response = await this.httpClient.post<IWriteResponse>('/v1/jobs', payload);
        return response.data;
    }

    /**
     * Updates an existing job
     */
    async update(job: IJobSpec): Promise<IWriteResponse> {
        const payload = { Job: job };
        const response = await this.httpClient.post<IWriteResponse>(`/v1/job/${job.ID}`, payload);
        return response.data;
    }

    /**
     * Deletes a job
     */
    async delete(jobId: string, purge: boolean = false): Promise<IWriteResponse> {
        const params = purge ? { purge: 'true' } : {};
        const response = await this.httpClient.delete<IWriteResponse>(`/v1/job/${jobId}`, { params });
        return response.data;
    }

    /**
     * Plans a job (dry-run)
     */
    async plan(job: IJobSpec): Promise<IJobPlan> {
        const payload = { Job: job, Diff: true };
        const response = await this.httpClient.post<IJobPlan>(`/v1/job/${job.ID}/plan`, payload);
        return response.data;
    }

    /**
     * Dispatches a parameterized job
     */
    async dispatch(jobId: string, payload?: any, meta?: Record<string, string>): Promise<IWriteResponse> {
        const requestPayload: any = {};
        
        if (payload) {
            requestPayload.Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
        }
        
        if (meta) {
            requestPayload.Meta = meta;
        }

        const response = await this.httpClient.post<IWriteResponse>(`/v1/job/${jobId}/dispatch`, requestPayload);
        return response.data;
    }

    /**
     * Reverts a job to a previous version
     */
    async revert(jobId: string, version: number, enforcePriorVersion?: number): Promise<IWriteResponse> {
        const payload: any = {
            JobID: jobId,
            JobVersion: version
        };

        if (enforcePriorVersion !== undefined) {
            payload.EnforcePriorVersion = enforcePriorVersion;
        }

        const response = await this.httpClient.post<IWriteResponse>(`/v1/job/${jobId}/revert`, payload);
        return response.data;
    }

    /**
     * Marks a job version as stable
     */
    async stable(jobId: string, version: number): Promise<IWriteResponse> {
        const payload = {
            JobID: jobId,
            JobVersion: version,
            Stable: true
        };

        const response = await this.httpClient.post<IWriteResponse>(`/v1/job/${jobId}/stable`, payload);
        return response.data;
    }

    /**
     * Gets job summary
     */
    async summary(jobId: string): Promise<IJobSummary> {
        const response = await this.httpClient.get<IJobSummary>(`/v1/job/${jobId}/summary`);
        return response.data;
    }

    /**
     * Lista versões de um job
     */
    async versions(jobId: string, diffs: boolean = false): Promise<IJobVersion[]> {
        const params = diffs ? { diffs: 'true' } : {};
        const response = await this.httpClient.get<{ Versions: IJobVersion[] }>(`/v1/job/${jobId}/versions`, { params });
        return response.data.Versions || [];
    }

    /**
     * Lista avaliações de um job
     */
    async evaluations(jobId: string): Promise<IEvaluation[]> {
        const response = await this.httpClient.get<IEvaluation[]>(`/v1/job/${jobId}/evaluations`);
        return response.data;
    }

    /**
     * Lista alocações de um job
     */
    async allocations(jobId: string): Promise<any[]> {
        const response = await this.httpClient.get<any[]>(`/v1/job/${jobId}/allocations`);
        return response.data;
    }

    /**
     * Lista deployments de um job
     */
    async deployments(jobId: string): Promise<any[]> {
        const response = await this.httpClient.get<any[]>(`/v1/job/${jobId}/deployments`);
        return response.data;
    }

    /**
     * Scales a task group
     */
    async scale(jobId: string, taskGroup: string, count: number): Promise<IWriteResponse> {
        const payload = {
            Count: count,
            Message: `Scaling ${taskGroup} to ${count} instances`,
            Target: {
                Job: jobId,
                Group: taskGroup
            }
        };

        const response = await this.httpClient.post<IWriteResponse>(`/v1/job/${jobId}/scale`, payload);
        return response.data;
    }

    /**
     * Stops a job
     */
    async stop(jobId: string, purge: boolean = false): Promise<IWriteResponse> {
        const payload = { Purge: purge };
        const response = await this.httpClient.delete<IWriteResponse>(`/v1/job/${jobId}`, {
            params: purge ? { purge: 'true' } : {}
        });
        return response.data;
    }

    /**
     * Restarts a job or task group
     */
    async restart(jobId: string, taskGroup?: string, allTasks: boolean = false): Promise<IWriteResponse> {
        let url = `/v1/client/job/${jobId}/restart`;
        
        const params: any = {};
        if (taskGroup) {
            params.task_group = taskGroup;
        }
        if (allTasks) {
            params.all_tasks = 'true';
        }

        const response = await this.httpClient.post<IWriteResponse>(url, {}, { params });
        return response.data;
    }

    /**
     * Parses/validates job HCL/JSON
     * POST /v1/jobs/parse
     */
    async parse(request: IJobParseRequest): Promise<IJobParseResponse> {
        const response = await this.httpClient.post<IJobParseResponse>('/v1/jobs/parse', request);
        return response.data;
    }

    /**
     * Validates a job specification without submitting it
     * POST /v1/validate/job
     */
    async validate(request: IJobValidateRequest): Promise<IJobValidateResponse> {
        const response = await this.httpClient.post<IJobValidateResponse>('/v1/validate/job', request);
        return response.data;
    }

    /**
     * Forces immediate execution of a periodic job
     * POST /v1/job/:jobID/periodic/force
     */
    async periodicForce(jobId: string): Promise<IWriteResponse> {
        const response = await this.httpClient.post<IWriteResponse>(`/v1/job/${jobId}/periodic/force`);
        return response.data;
    }

    /**
     * Obtém informações sobre configuração periódica de um job
     * GET /v1/job/:jobID/periodic
     */
    async periodicInfo(jobId: string): Promise<IJobPeriodicInfo> {
        const response = await this.httpClient.get<IJobPeriodicInfo>(`/v1/job/${jobId}/periodic`);
        return response.data;
    }

    /**
     * Método de conveniência para validar e fazer parse de HCL
     */
    async parseAndValidateHCL(hclContent: string, canonicalize: boolean = true): Promise<{
        job: IJobSpec;
        warnings: string[];
        validationErrors: string[];
        isValid: boolean;
    }> {
        try {
            // Primeiro faz parse do HCL
            const parseResult = await this.parse({
                JobHCL: hclContent,
                Canonicalize: canonicalize
            });

            // Depois valida o job
            const validateResult = await this.validate({
                Job: parseResult.Job
            });

            return {
                job: parseResult.Job,
                warnings: [...(parseResult.Warnings || []), ...(validateResult.Warnings || [])],
                validationErrors: validateResult.ValidationErrors?.map(e => e.Message) || 
                                (validateResult.Error ? [validateResult.Error] : []),
                isValid: !validateResult.Error && (!validateResult.ValidationErrors || validateResult.ValidationErrors.length === 0)
            };

        } catch (error: any) {
            return {
                job: {} as IJobSpec,
                warnings: [],
                validationErrors: [error?.message || 'Parse/validation failed'],
                isValid: false
            };
        }
    }

    /**
     * Método de conveniência para obter informações completas de um job
     */
    async getJobInfo(jobId: string): Promise<{
        job: IJobSpec;
        summary: IJobSummary;
        versions: IJobVersion[];
        allocations: any[];
        deployments: any[];
        evaluations: IEvaluation[];
        periodicInfo?: IJobPeriodicInfo;
    }> {
        const [job, summary, versions, allocations, deployments, evaluations] = await Promise.all([
            this.get(jobId),
            this.summary(jobId),
            this.versions(jobId),
            this.allocations(jobId),
            this.deployments(jobId),
            this.evaluations(jobId)
        ]);

        const result: any = {
            job,
            summary,
            versions,
            allocations,
            deployments,
            evaluations
        };

        // Adiciona info periódica se for job periódico
        if (job.Periodic && job.Periodic.Enabled) {
            try {
                result.periodicInfo = await this.periodicInfo(jobId);
            } catch (error) {
                // Ignora erro se endpoint não suportar info periódica
            }
        }

        return result;
    }

    /**
     * Método de conveniência para verificar se job está saudável
     */
    async isHealthy(jobId: string): Promise<{
        isHealthy: boolean;
        status: string;
        runningAllocations: number;
        totalAllocations: number;
        details: {
            running: number;
            pending: number;
            complete: number;
            failed: number;
            lost: number;
        };
    }> {
        try {
            const [job, summary, allocations] = await Promise.all([
                this.get(jobId),
                this.summary(jobId),
                this.allocations(jobId)
            ]);

            const details = {
                running: 0,
                pending: 0,
                complete: 0,
                failed: 0,
                lost: 0
            };

            // Contar allocations por status
            allocations.forEach((alloc: any) => {
                switch (alloc.ClientStatus) {
                    case 'running':
                        details.running++;
                        break;
                    case 'pending':
                        details.pending++;
                        break;
                    case 'complete':
                        details.complete++;
                        break;
                    case 'failed':
                        details.failed++;
                        break;
                    case 'lost':
                        details.lost++;
                        break;
                }
            });

            const isHealthy = job.Status === 'running' && 
                            details.running > 0 && 
                            details.failed === 0 && 
                            details.lost === 0;

            return {
                isHealthy,
                status: job.Status || 'unknown',
                runningAllocations: details.running,
                totalAllocations: allocations.length,
                details
            };

        } catch (error) {
            return {
                isHealthy: false,
                status: 'error',
                runningAllocations: 0,
                totalAllocations: 0,
                details: {
                    running: 0,
                    pending: 0,
                    complete: 0,
                    failed: 0,
                    lost: 0
                }
            };
        }
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

/**
 * Classe de conveniência que herda de NomadJobModule
 * Mantém compatibilidade com código existente
 */
export class NomadJob extends NomadJobModule {
    constructor(httpClient: IHttpClient) {
        super(httpClient);
    }

    /**
     * Método de conveniência para deploy (create ou update)
     */
    async deploy(job: IJobSpec): Promise<IWriteResponse> {
        try {
            // Tenta obter o job existente
            await this.get(job.ID);
            // Se existe, atualiza
            return await this.update(job);
        } catch (error) {
            // Se não existe, cria novo
            return await this.create(job);
        }
    }

    /**
     * Método de conveniência para verificar status
     */
    async getStatus(jobId: string): Promise<{ status: string; summary: IJobSummary }> {
        const [job, summary] = await Promise.all([
            this.get(jobId),
            this.summary(jobId)
        ]);

        return {
            status: job.Status || 'unknown',
            summary
        };
    }

    /**
     * Método de conveniência para aguardar deployment
     */
    async waitForDeployment(jobId: string, timeoutMs: number = 300000): Promise<boolean> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            const status = await this.getStatus(jobId);
            
            if (status.status === 'running') {
                const running = Object.values(status.summary.Summary)
                    .reduce((sum, tg) => sum + tg.Running, 0);
                
                const desired = Object.values(status.summary.Summary)
                    .reduce((sum, tg) => sum + tg.Running + tg.Queued + tg.Starting, 0);

                if (running === desired && running > 0) {
                    return true;
                }
            }

            // Aguarda 2 segundos antes da próxima verificação
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return false;
    }

    /**
     * Método de conveniência para validar e fazer parse de HCL
     */
    async parseAndValidateHCL(hclContent: string, canonicalize: boolean = true): Promise<{
        job: IJobSpec;
        warnings: string[];
        validationErrors: string[];
        isValid: boolean;
    }> {
        try {
            // Primeiro faz parse do HCL
            const parseResult = await this.parse({
                JobHCL: hclContent,
                Canonicalize: canonicalize
            });

            // Depois valida o job
            const validateResult = await this.validate({
                Job: parseResult.Job
            });

            return {
                job: parseResult.Job,
                warnings: [...(parseResult.Warnings || []), ...(validateResult.Warnings || [])],
                validationErrors: validateResult.ValidationErrors?.map(e => e.Message) || 
                                (validateResult.Error ? [validateResult.Error] : []),
                isValid: !validateResult.Error && (!validateResult.ValidationErrors || validateResult.ValidationErrors.length === 0)
            };

        } catch (error: any) {
            return {
                job: {} as IJobSpec,
                warnings: [],
                validationErrors: [error?.message || 'Parse/validation failed'],
                isValid: false
            };
        }
    }

    /**
     * Método de conveniência para obter informações completas de um job
     */
    async getJobInfo(jobId: string): Promise<{
        job: IJobSpec;
        summary: IJobSummary;
        versions: IJobVersion[];
        allocations: any[];
        deployments: any[];
        evaluations: IEvaluation[];
        periodicInfo?: IJobPeriodicInfo;
    }> {
        const [job, summary, versions, allocations, deployments, evaluations] = await Promise.all([
            this.get(jobId),
            this.summary(jobId),
            this.versions(jobId),
            this.allocations(jobId),
            this.deployments(jobId),
            this.evaluations(jobId)
        ]);

        const result: any = {
            job,
            summary,
            versions,
            allocations,
            deployments,
            evaluations
        };

        // Adiciona info periódica se for job periódico
        if (job.Periodic && job.Periodic.Enabled) {
            try {
                result.periodicInfo = await this.periodicInfo(jobId);
            } catch (error) {
                // Ignora erro se endpoint não suportar info periódica
            }
        }

        return result;
    }

    /**
     * Método de conveniência para verificar se job está saudável
     */
    async isHealthy(jobId: string): Promise<{
        isHealthy: boolean;
        status: string;
        runningAllocations: number;
        totalAllocations: number;
        details: {
            running: number;
            pending: number;
            complete: number;
            failed: number;
            lost: number;
        };
    }> {
        try {
            const [job, summary, allocations] = await Promise.all([
                this.get(jobId),
                this.summary(jobId),
                this.allocations(jobId)
            ]);

            const details = {
                running: 0,
                pending: 0,
                complete: 0,
                failed: 0,
                lost: 0
            };

            // Contar allocations por status
            allocations.forEach((alloc: any) => {
                switch (alloc.ClientStatus) {
                    case 'running':
                        details.running++;
                        break;
                    case 'pending':
                        details.pending++;
                        break;
                    case 'complete':
                        details.complete++;
                        break;
                    case 'failed':
                        details.failed++;
                        break;
                    case 'lost':
                        details.lost++;
                        break;
                }
            });

            const isHealthy = job.Status === 'running' && 
                            details.running > 0 && 
                            details.failed === 0 && 
                            details.lost === 0;

            return {
                isHealthy,
                status: job.Status || 'unknown',
                runningAllocations: details.running,
                totalAllocations: allocations.length,
                details
            };

        } catch (error) {
            return {
                isHealthy: false,
                status: 'error',
                runningAllocations: 0,
                totalAllocations: 0,
                details: {
                    running: 0,
                    pending: 0,
                    complete: 0,
                    failed: 0,
                    lost: 0
                }
            };
        }
    }
}