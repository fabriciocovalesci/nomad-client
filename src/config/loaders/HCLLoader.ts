import { BaseConfigLoader } from './BaseConfigLoader';
import { INomadJobConfig } from '../interfaces/IConfigLoader';

/**
 * HCLLoader - Implementação específica para arquivos HCL do HashiCorp
 * Segue Single Responsibility Principle - apenas carrega arquivos HCL
 * 
 * Nota: Para produção, considere usar uma biblioteca como '@hashicorp/hcl-parser'
 * ou 'node-hcl-parser' para parsing mais robusto
 */
export class HCLLoader extends BaseConfigLoader<INomadJobConfig> {
    protected readonly supportedExtensions = ['.hcl', '.nomad'];
    protected readonly format = 'hcl';

    /**
     * Parse específico para HCL
     * Implementação básica - para produção use uma lib dedicada
     */
    protected async parseContent(content: string): Promise<INomadJobConfig> {
        try {
            // Para uma implementação básica, vamos converter HCL simples para JSON
            const jsonContent = this.convertHCLToJSON(content);
            const parsed = JSON.parse(jsonContent);
            return this.normalizeNomadConfig(parsed);
        } catch (error) {
            throw new Error(`Invalid HCL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validação específica para configurações Nomad em HCL
     */
    protected async validateContent(data: INomadJobConfig): Promise<INomadJobConfig> {
        if (!data.job) {
            throw new Error('Missing required "job" block in HCL configuration');
        }

        const job = data.job;

        if (!job.id || !job.name) {
            throw new Error('Job block must have "id" and "name" attributes');
        }

        if (!job.type || !['service', 'batch', 'system'].includes(job.type)) {
            throw new Error('Job type must be one of: service, batch, system');
        }

        if (!job.datacenters || !Array.isArray(job.datacenters) || job.datacenters.length === 0) {
            throw new Error('Job must specify at least one datacenter');
        }

        return data;
    }

    /**
     * Conversão básica de HCL para JSON
     * ATENÇÃO: Esta é uma implementação simplificada para demonstração
     * Para produção, use uma biblioteca dedicada de parsing HCL
     */
    private convertHCLToJSON(hclContent: string): string {
        try {
            // Remove comentários
            const withoutComments = hclContent.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
            
            // Implementação muito básica - apenas para jobs simples
            const jobMatch = withoutComments.match(/job\s+"([^"]+)"\s*\{([\s\S]+)\}/);
            if (!jobMatch) {
                throw new Error('No job block found in HCL');
            }

            const jobId = jobMatch[1];
            const jobContent = jobMatch[2];

            // Parse básico dos atributos
            const attributes: any = {
                id: jobId,
                name: jobId // Por padrão, usa o ID como name
            };

            // Extrai atributos simples
            const attributeMatches = jobContent.matchAll(/(\w+)\s*=\s*"([^"]+)"/g);
            for (const match of attributeMatches) {
                attributes[match[1]] = match[2];
            }

            // Extrai arrays (como datacenters)
            const arrayMatches = jobContent.matchAll(/(\w+)\s*=\s*\[([\s\S]*?)\]/g);
            for (const match of arrayMatches) {
                const items = match[2]
                    .split(',')
                    .map(item => item.trim().replace(/"/g, ''))
                    .filter(item => item.length > 0);
                attributes[match[1]] = items;
            }

            return JSON.stringify({ job: attributes });
        } catch (error) {
            throw new Error(`HCL parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Normaliza a configuração HCL para o formato padrão
     */
    private normalizeNomadConfig(data: any): INomadJobConfig {
        if (data.job) {
            return data as INomadJobConfig;
        }

        throw new Error('Invalid HCL job structure');
    }

    /**
     * Método para configurar parser HCL externo (Dependency Inversion Principle)
     */
    public static withCustomParser(parser: (content: string) => any): typeof HCLLoader {
        class CustomHCLLoader extends HCLLoader {
            protected async parseContent(content: string): Promise<INomadJobConfig> {
                try {
                    const parsed = parser(content);
                    return this.normalizeNomadConfig(parsed);
                } catch (error) {
                    throw new Error(`Custom HCL parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        }
        return CustomHCLLoader;
    }
}