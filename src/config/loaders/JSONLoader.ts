import { BaseConfigLoader } from './BaseConfigLoader';
import { INomadJobConfig } from '../interfaces/IConfigLoader';

/**
 * JSONLoader - Implementação específica para arquivos JSON
 * Segue Single Responsibility Principle - apenas carrega arquivos JSON
 */
export class JSONLoader extends BaseConfigLoader<INomadJobConfig> {
    protected readonly supportedExtensions = ['.json'];
    protected readonly format = 'json';

    /**
     * Parse específico para JSON
     */
    protected async parseContent(content: string): Promise<INomadJobConfig> {
        try {
            const parsed = JSON.parse(content);
            return this.normalizeNomadConfig(parsed);
        } catch (error) {
            throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validação específica para configurações Nomad em JSON
     */
    protected async validateContent(data: INomadJobConfig): Promise<INomadJobConfig> {
        if (!data.job) {
            throw new Error('Missing required "job" property in configuration');
        }

        if (!data.job.id || !data.job.name) {
            throw new Error('Job must have "id" and "name" properties');
        }

        if (!data.job.type || !['service', 'batch', 'system'].includes(data.job.type)) {
            throw new Error('Job type must be one of: service, batch, system');
        }

        if (!data.job.datacenters || !Array.isArray(data.job.datacenters) || data.job.datacenters.length === 0) {
            throw new Error('Job must specify at least one datacenter');
        }

        return data;
    }

    /**
     * Normaliza a estrutura para o formato esperado do Nomad
     */
    private normalizeNomadConfig(data: any): INomadJobConfig {
        // Se já está no formato correto
        if (data.job) {
            return data as INomadJobConfig;
        }

        // Se é um job direto (sem wrapper "job")
        if (data.id && data.name && data.type) {
            return {
                job: data
            };
        }

        // Formato inválido
        throw new Error('Invalid Nomad job configuration structure');
    }
}