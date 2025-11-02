/**
 * Tipos base para a API do Nomad HashiCorp
 */

// Tipos básicos
export type JobType = 'service' | 'batch' | 'system' | 'sysbatch';
export type JobStatus = 'pending' | 'running' | 'dead';
export type AllocationStatus = 'pending' | 'running' | 'complete' | 'failed' | 'lost';
export type TaskState = 'pending' | 'running' | 'dead';

// Interface base para recursos do Nomad
export interface INomadResource {
    ID: string;
    Name: string;
    CreateIndex: number;
    ModifyIndex: number;
}

// Configuração de rede
export interface INetworkResource {
    Mode: string;
    Device: string;
    CIDR: string;
    IP: string;
    MBits: number;
    DNS?: {
        Servers: string[];
        Searches: string[];
        Options: string[];
    };
    ReservedPorts?: IPort[];
    DynamicPorts?: IPort[];
}

export interface IPort {
    Label: string;
    Value: number;
    To?: number;
    HostNetwork?: string;
}

// Recursos computacionais
export interface IResources {
    CPU: number;
    MemoryMB: number;
    DiskMB: number;
    Networks?: INetworkResource[];
    Devices?: IDeviceResource[];
}

export interface IDeviceResource {
    Name: string;
    Count: number;
    Constraints?: IConstraint[];
    Affinities?: IAffinity[];
}

// Restrições e afinidades
export interface IConstraint {
    LTarget: string;
    RTarget: string;
    Operand: string;
}

export interface IAffinity {
    LTarget: string;
    RTarget: string;
    Operand: string;
    Weight: number;
}

// Configuração de task
export interface ITaskConfig {
    [key: string]: any;
    image?: string;
    command?: string;
    args?: string[];
    ports?: string[];
    volumes?: string[];
    environment?: Record<string, string>;
}

// Logs de task
export interface ITaskLogs {
    stdout: string;
    stderr: string;
    exitCode?: number;
}

// Eventos de allocation
export interface IAllocationEvent {
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

// Métricas de recurso
export interface IResourceUsage {
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
}

// Status de health check
export interface IHealthCheck {
    ID: string;
    Name: string;
    Type: string;
    Command: string;
    Args: string[];
    Path: string;
    Protocol: string;
    PortLabel: string;
    Interval: number;
    Timeout: number;
    InitialStatus: string;
    TLSSkipVerify: boolean;
    Method: string;
    Header: Record<string, string[]>;
    CheckRestart: {
        Limit: number;
        Grace: number;
        IgnoreWarnings: boolean;
    };
}

// Interface para parâmetros de query comuns
export interface IQueryOptions {
    region?: string;
    namespace?: string;
    index?: number;
    wait?: string;
    stale?: boolean;
    prefix?: string;
    'per-page'?: number;
    'next-token'?: string;
}

// Interface para resposta de listagem
export interface IListResponse<T> {
    data: T[];
    nextToken?: string;
    totalCount?: number;
}

// Interface para operações de escrita
export interface IWriteResponse {
    EvalID?: string;
    EvalCreateIndex?: number;
    JobModifyIndex?: number;
    Index?: number;
}