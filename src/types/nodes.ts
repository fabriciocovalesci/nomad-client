import { IQueryOptions, IResources, INetworkResource } from './nomad';

/**
 * Tipos para a API de Nodes do Nomad
 * Referência: https://developer.hashicorp.com/nomad/api-docs/nodes
 */

export type NodeStatus = 'initializing' | 'ready' | 'down' | 'disconnected';
export type NodeSchedulingEligibility = 'eligible' | 'ineligible';
export type NodeClass = string;

/**
 * Interface para Node
 */
export interface INode {
    ID: string;
    Datacenter: string;
    Name: string;
    NodeClass: string;
    NodePool: string;
    Drain: boolean;
    SchedulingEligibility: NodeSchedulingEligibility;
    Status: NodeStatus;
    StatusDescription: string;
    StatusUpdatedAt: number;
    LastDrain?: INodeDrainStrategy;
    CreateIndex: number;
    ModifyIndex: number;
    
    // Recursos do node
    NodeResources?: INodeResources;
    ReservedResources?: INodeReservedResources;
    Resources?: IResources;
    Reserved?: IResources;
    
    // Atributos e meta
    Attributes?: Record<string, string>;
    Meta?: Record<string, string>;
    
    // Links e drivers
    Links?: Record<string, string>;
    Drivers?: Record<string, INodeDriverInfo>;
    
    // CSI
    CSIControllerPlugins?: Record<string, ICSIInfo>;
    CSINodePlugins?: Record<string, ICSIInfo>;
    
    // Host info
    HostVolumes?: Record<string, IClientHostVolumeConfig>;
    
    // Eventos
    Events?: INodeEvent[];
}

/**
 * Interface para recursos do Node
 */
export interface INodeResources {
    Cpu: INodeCpuResources;
    Memory: INodeMemoryResources;
    Disk: INodeDiskResources;
    Networks: INetworkResource[];
    Devices?: INodeDeviceResource[];
}

export interface INodeCpuResources {
    CpuShares: number;
    TotalCompute: number;
    ReservableCpuCores?: number[];
}

export interface INodeMemoryResources {
    MemoryMB: number;
}

export interface INodeDiskResources {
    DiskMB: number;
}

export interface INodeDeviceResource {
    Type: string;
    Vendor: string;
    Name: string;
    Attributes: Record<string, string>;
    Instances: INodeDevice[];
}

export interface INodeDevice {
    ID: string;
    Healthy: boolean;
    HealthDescription: string;
    Locality?: INodeDeviceLocality;
}

export interface INodeDeviceLocality {
    PciBusID: string;
}

/**
 * Interface para recursos reservados do Node
 */
export interface INodeReservedResources {
    Cpu: INodeCpuResources;
    Memory: INodeMemoryResources;
    Disk: INodeDiskResources;
    Networks: INetworkResource[];
}

/**
 * Interface para informações de driver
 */
export interface INodeDriverInfo {
    Attributes?: Record<string, string>;
    Detected: boolean;
    Healthy: boolean;
    HealthDescription: string;
    UpdateTime: string;
}

/**
 * Interface para CSI Info
 */
export interface ICSIInfo {
    PluginID: string;
    Healthy: boolean;
    HealthDescription: string;
    RequiresControllerPlugin: boolean;
    RequiresTopologies: boolean;
    ControllerInfo?: ICSIControllerInfo;
    NodeInfo?: ICSINodeInfo;
}

export interface ICSIControllerInfo {
    SupportsReadOnlyAttach: boolean;
    SupportsAttachDetach: boolean;
    SupportsListVolumes: boolean;
    SupportsListVolumesAttachedNodes: boolean;
}

export interface ICSINodeInfo {
    ID: string;
    MaxVolumes: number;
    RequiresNodeStageVolume: boolean;
}

/**
 * Interface para configuração de host volume
 */
export interface IClientHostVolumeConfig {
    Name: string;
    Path: string;
    ReadOnly: boolean;
}

/**
 * Interface para eventos do Node
 */
export interface INodeEvent {
    Message: string;
    Subsystem: string;
    Details?: Record<string, string>;
    Timestamp: string;
    CreateIndex: number;
}

/**
 * Interface para estratégia de drain
 */
export interface INodeDrainStrategy {
    DrainSpec?: INodeDrainSpec;
    StartedAt?: string;
    UpdatedAt?: string;
}

export interface INodeDrainSpec {
    Deadline?: number; // nanoseconds
    IgnoreSystemJobs?: boolean;
}

/**
 * Interface para estatísticas do Node
 */
export interface INodeStats {
    Timestamp: number;
    CPUTicksConsumed: number;
    Memory: IHostMemoryStats;
    Uptime: number;
    DiskStats: IHostDiskStats[];
    AllocDirStats: IHostDiskStats;
    CPU: IHostCPUStats[];
}

export interface IHostMemoryStats {
    Total: number;
    Available: number;
    Used: number;
    Free: number;
}

export interface IHostDiskStats {
    Device: string;
    Mountpoint: string;
    Size: number;
    Used: number;
    Available: number;
    UsedPercent: number;
    InodesUsedPercent: number;
}

export interface IHostCPUStats {
    CPU: string;
    User: number;
    System: number;
    Idle: number;
    Nice: number;
    Iowait: number;
    Irq: number;
    Softirq: number;
    Steal: number;
    Guest: number;
    GuestNice: number;
}

/**
 * Interface para opções de listagem de Nodes
 */
export interface INodeListOptions extends IQueryOptions {
    resources?: boolean;
}

/**
 * Interface para requisições de drain
 */
export interface INodeDrainRequest {
    DrainSpec?: INodeDrainSpec;
    MarkEligible?: boolean;
    Meta?: Record<string, string>;
}

/**
 * Interface para requisições de eligibility
 */
export interface INodeEligibilityRequest {
    NodeID: string;
    Eligibility: NodeSchedulingEligibility;
}

/**
 * Interface para requisições de purge
 */
export interface INodePurgeRequest {
    NodeID: string;
}