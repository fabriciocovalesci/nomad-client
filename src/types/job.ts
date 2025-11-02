import { 
    INomadResource, 
    IResources, 
    IConstraint, 
    IAffinity, 
    ITaskConfig,
    IHealthCheck,
    JobType, 
    JobStatus,
    IQueryOptions,
    IListResponse,
    IWriteResponse 
} from './nomad';

/**
 * Interfaces específicas para Jobs
 */

export interface ITaskGroup {
    Name: string;
    Count: number;
    Constraints?: IConstraint[];
    Affinities?: IAffinity[];
    Tasks: ITask[];
    RestartPolicy?: IRestartPolicy;
    ReschedulePolicy?: IReschedulePolicy;
    EphemeralDisk?: IEphemeralDisk;
    Update?: IUpdateStrategy;
    Migrate?: IMigrateStrategy;
    Networks?: any[];
    Meta?: Record<string, string>;
    Services?: IService[];
    Volumes?: Record<string, IVolume>;
    Scaling?: IScalingPolicy;
}

export interface ITask {
    Name: string;
    Driver: string;
    User?: string;
    Config: ITaskConfig;
    Constraints?: IConstraint[];
    Affinities?: IAffinity[];
    Env?: Record<string, string>;
    Services?: IService[];
    Resources: IResources;
    Meta?: Record<string, string>;
    KillTimeout?: number;
    LogConfig?: ILogConfig;
    Artifacts?: IArtifact[];
    Vault?: IVault;
    Templates?: ITemplate[];
    DispatchPayload?: IDispatchPayload;
    Lifecycle?: ILifecycle;
    RestartPolicy?: IRestartPolicy;
    Leader?: boolean;
    ShutdownDelay?: number;
    KillSignal?: string;
}

export interface IJobSpec {
    ID: string;
    Name: string;
    Region?: string;
    Namespace?: string;
    Type: JobType;
    Priority?: number;
    AllAtOnce?: boolean;
    Datacenters: string[];
    Constraints?: IConstraint[];
    Affinities?: IAffinity[];
    TaskGroups: ITaskGroup[];
    Update?: IUpdateStrategy;
    Multiregion?: IMultiregion;
    Spreads?: ISpread[];
    Periodic?: IPeriodic;
    ParameterizedJob?: IParameterizedJob;
    Dispatched?: boolean;
    Payload?: string;
    Meta?: Record<string, string>;
    ConsulToken?: string;
    VaultToken?: string;
    Status?: JobStatus;
    StatusDescription?: string;
    Stable?: boolean;
    Version?: number;
    SubmitTime?: number;
    CreateIndex?: number;
    ModifyIndex?: number;
    JobModifyIndex?: number;
}

// Políticas e configurações
export interface IRestartPolicy {
    Attempts: number;
    Interval: number;
    Delay: number;
    Mode: 'fail' | 'delay';
}

export interface IReschedulePolicy {
    Attempts: number;
    Interval: number;
    Delay: number;
    DelayFunction: 'constant' | 'exponential' | 'fibonacci';
    MaxDelay: number;
    Unlimited: boolean;
}

export interface IUpdateStrategy {
    Stagger: number;
    MaxParallel: number;
    HealthCheck: 'checks' | 'task_states' | 'manual';
    MinHealthyTime: number;
    HealthyDeadline: number;
    ProgressDeadline: number;
    AutoRevert: boolean;
    AutoPromote: boolean;
    Canary: number;
}

export interface IMigrateStrategy {
    MaxParallel: number;
    HealthCheck: string;
    MinHealthyTime: number;
    HealthyDeadline: number;
}

export interface IEphemeralDisk {
    Sticky: boolean;
    SizeMB: number;
    Migrate: boolean;
}

export interface IService {
    Name: string;
    PortLabel?: string;
    Tags?: string[];
    CanaryTags?: string[];
    EnableTagOverride?: boolean;
    Checks?: IHealthCheck[];
    Connect?: IConnect;
    Meta?: Record<string, string>;
    CanaryMeta?: Record<string, string>;
    TaskName?: string;
    AddressMode?: string;
    Address?: string;
    Port?: number;
}

export interface IConnect {
    Native?: boolean;
    Gateway?: any;
    SidecarService?: any;
    SidecarTask?: any;
}

export interface IVolume {
    Name: string;
    Type: string;
    ReadOnly: boolean;
    Source: string;
    MountOptions?: {
        FSType: string;
        MountFlags: string[];
    };
}

export interface ILogConfig {
    MaxFiles: number;
    MaxFileSizeMB: number;
}

export interface IArtifact {
    GetterSource: string;
    GetterOptions: Record<string, string>;
    GetterHeaders: Record<string, string>;
    GetterMode: string;
    RelativeDest: string;
}

export interface IVault {
    Policies: string[];
    Namespace?: string;
    Env?: boolean;
    ChangeMode?: string;
    ChangeSignal?: string;
}

export interface ITemplate {
    SourcePath: string;
    DestPath: string;
    EmbeddedTmpl: string;
    ChangeMode: string;
    ChangeSignal?: string;
    Splay: number;
    Perms: string;
    LeftDelim?: string;
    RightDelim?: string;
    Envvars?: boolean;
    VaultGrace?: number;
}

export interface IDispatchPayload {
    File: string;
}

export interface ILifecycle {
    Hook: 'prestart' | 'poststart' | 'poststop';
    Sidecar: boolean;
}

export interface IScalingPolicy {
    Min?: number;
    Max: number;
    Policy?: Record<string, any>;
    Enabled?: boolean;
}

export interface IMultiregion {
    Strategy?: IMultiregionStrategy;
    Regions: IMultiregionRegion[];
}

export interface IMultiregionStrategy {
    MaxParallel: number;
    OnFailure: string;
}

export interface IMultiregionRegion {
    Name: string;
    Count: number;
    Datacenters: string[];
    Meta?: Record<string, string>;
}

export interface ISpread {
    Attribute: string;
    Weight?: number;
    SpreadTarget: ISpreadTarget[];
}

export interface ISpreadTarget {
    Value: string;
    Percent: number;
}

export interface IPeriodic {
    Enabled?: boolean;
    Spec: string;
    SpecType?: string;
    ProhibitOverlap?: boolean;
    TimeZone?: string;
}

export interface IParameterizedJob {
    Payload?: string;
    MetaRequired?: string[];
    MetaOptional?: string[];
}

// Interfaces para operações de Job
export interface IJobListOptions extends IQueryOptions {
    meta?: boolean;
}

export interface IJobSummary {
    JobID: string;
    Namespace: string;
    Summary: Record<string, ITaskGroupSummary>;
    Children?: IJobChildrenSummary;
    CreateIndex: number;
    ModifyIndex: number;
}

export interface ITaskGroupSummary {
    Queued: number;
    Complete: number;
    Failed: number;
    Running: number;
    Starting: number;
    Lost: number;
}

export interface IJobChildrenSummary {
    Pending: number;
    Running: number;
    Dead: number;
}

export interface IJobVersion {
    Version: number;
    Stable: boolean;
    Diff?: IJobDiff;
    CreateIndex: number;
    ModifyIndex: number;
    SubmitTime: number;
}

export interface IJobDiff {
    Type: string;
    ID: string;
    Fields?: IFieldDiff[];
    Objects?: IObjectDiff[];
    TaskGroups?: ITaskGroupDiff[];
}

export interface IFieldDiff {
    Type: string;
    Name: string;
    Old: string;
    New: string;
    Annotations?: string[];
}

export interface IObjectDiff {
    Type: string;
    Name: string;
    Fields?: IFieldDiff[];
    Objects?: IObjectDiff[];
}

export interface ITaskGroupDiff {
    Type: string;
    Name: string;
    Fields?: IFieldDiff[];
    Objects?: IObjectDiff[];
    Tasks?: ITaskDiff[];
    Updates?: Record<string, number>;
}

export interface ITaskDiff {
    Type: string;
    Name: string;
    Fields?: IFieldDiff[];
    Objects?: IObjectDiff[];
    Annotations?: string[];
}

export interface IJobPlan {
    Index: number;
    NextPeriodicLaunch?: number;
    Warnings?: string;
    Diff?: IJobDiff;
    Annotations?: IJobAnnotations;
    FailedTGAllocs?: Record<string, IAllocationMetric>;
    JobModifyIndex?: number;
    CreatedEvals?: IEvaluation[];
}

export interface IJobAnnotations {
    DesiredTGUpdates?: Record<string, IDesiredUpdates>;
}

export interface IDesiredUpdates {
    Ignore: number;
    Place: number;
    Migrate: number;
    Stop: number;
    InPlaceUpdate: number;
    DestructiveUpdate: number;
    Canary: number;
    Preemptions: number;
}

export interface IAllocationMetric {
    NodesEvaluated: number;
    NodesFiltered: number;
    NodesAvailable: Record<string, number>;
    ClassFiltered?: Record<string, number>;
    ConstraintFiltered?: Record<string, number>;
    NodesExhausted: number;
    ClassExhausted?: Record<string, number>;
    DimensionExhausted?: Record<string, number>;
    QuotaExhausted?: string[];
    Scores?: Record<string, number>;
    AllocationTime: number;
    CoalescedFailures: number;
}

export interface IEvaluation {
    ID: string;
    Priority: number;
    Type: string;
    TriggeredBy: string;
    JobID?: string;
    JobModifyIndex?: number;
    NodeID?: string;
    NodeModifyIndex?: number;
    Status: string;
    StatusDescription?: string;
    Wait: number;
    NextEval?: string;
    PreviousEval?: string;
    BlockedEval?: string;
    FailedTGAllocs?: Record<string, IAllocationMetric>;
    ClassEligibility?: Record<string, boolean>;
    EscapedComputedClass?: boolean;
    QuotaLimitReached?: string;
    AnnotatePlan?: boolean;
    QueuedAllocations?: Record<string, number>;
    LeaderACL?: string;
    SnapshotIndex?: number;
    CreateIndex: number;
    ModifyIndex: number;
}
