import { IQueryOptions } from './nomad';

/**
 * Tipos para a API de Node Pools do Nomad
 * Referência: https://developer.hashicorp.com/nomad/api-docs/node-pools
 */

/**
 * Interface para Node Pool
 */
export interface INodePool {
    Name: string;
    Description?: string;
    Meta?: Record<string, string>;
    SchedulerConfiguration?: INodePoolSchedulerConfig;
    CreateIndex: number;
    ModifyIndex: number;
}

/**
 * Interface para configuração do scheduler do Node Pool
 */
export interface INodePoolSchedulerConfig {
    SchedulerAlgorithm?: 'binpack' | 'spread';
    MemoryOversubscriptionEnabled?: boolean;
}

/**
 * Interface para opções de listagem de Node Pools
 */
export interface INodePoolListOptions extends IQueryOptions {
    // Node pools não têm opções especiais de listagem além das padrão
}

/**
 * Interface para criação/atualização de Node Pool
 */
export interface INodePoolUpsertRequest {
    NodePool: INodePool;
}

/**
 * Interface para atualização de Node Pool
 */
export interface INodePoolUpdateRequest {
    NodePool: Partial<INodePool> & { Name: string };
}

/**
 * Interface para resposta de informações dos Node Pools
 */
export interface INodePoolInfo extends INodePool {
    // Pode incluir informações adicionais de runtime
    NodesCount?: number;
    JobsCount?: number;
}