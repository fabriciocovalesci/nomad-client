import { IConfigLoader } from '../interfaces/IConfigLoader';
import { JSONLoader } from './JSONLoader';
import { HCLLoader } from './HCLLoader';

/**
 * Registry para loaders - seguindo Dependency Inversion Principle
 */
interface ILoaderRegistry {
    register(type: string, loader: () => IConfigLoader): void;
    get(type: string): IConfigLoader;
    getByFilePath(filePath: string): IConfigLoader;
    getSupportedTypes(): string[];
}

/**
 * Implementação do registry de loaders
 */
class LoaderRegistry implements ILoaderRegistry {
    private loaders = new Map<string, () => IConfigLoader>();
    private instances = new Map<string, IConfigLoader>();

    public register(type: string, loaderFactory: () => IConfigLoader): void {
        this.loaders.set(type.toLowerCase(), loaderFactory);
    }

    public get(type: string): IConfigLoader {
        const normalizedType = type.toLowerCase();
        
        // Verifica se já existe uma instância
        if (this.instances.has(normalizedType)) {
            return this.instances.get(normalizedType)!;
        }

        // Cria nova instância
        const loaderFactory = this.loaders.get(normalizedType);
        if (!loaderFactory) {
            throw new Error(`No loader registered for type: ${type}. Available: ${this.getSupportedTypes().join(', ')}`);
        }

        const instance = loaderFactory();
        this.instances.set(normalizedType, instance);
        return instance;
    }

    public getByFilePath(filePath: string): IConfigLoader {
        for (const [type, loaderFactory] of this.loaders) {
            const instance = this.instances.get(type) || loaderFactory();
            if (instance.canHandle(filePath)) {
                if (!this.instances.has(type)) {
                    this.instances.set(type, instance);
                }
                return instance;
            }
        }

        throw new Error(`No loader found for file: ${filePath}`);
    }

    public getSupportedTypes(): string[] {
        return Array.from(this.loaders.keys());
    }

    public clear(): void {
        this.loaders.clear();
        this.instances.clear();
    }
}

/**
 * LoaderFactory melhorada - seguindo Open/Closed e Dependency Inversion Principles
 * Permite extensão fácil de novos loaders sem modificação do código existente
 */
export class LoaderFactory {
    private static registry = new LoaderRegistry();
    private static initialized = false;

    /**
     * Inicializa loaders padrão
     */
    private static initialize(): void {
        if (this.initialized) return;

        // Registra loaders padrão
        this.registry.register('json', () => new JSONLoader());
        this.registry.register('hcl', () => new HCLLoader());
        
        this.initialized = true;
    }

    /**
     * Obtém loader por tipo
     */
    public static getLoader(type: string): IConfigLoader {
        this.initialize();
        return this.registry.get(type);
    }

    /**
     * Obtém loader automaticamente baseado no arquivo
     */
    public static getLoaderForFile(filePath: string): IConfigLoader {
        this.initialize();
        return this.registry.getByFilePath(filePath);
    }

    /**
     * Registra um novo tipo de loader (Extensibilidade)
     */
    public static registerLoader(type: string, loaderFactory: () => IConfigLoader): void {
        this.initialize();
        this.registry.register(type, loaderFactory);
    }

    /**
     * Lista tipos de loaders disponíveis
     */
    public static getSupportedTypes(): string[] {
        this.initialize();
        return this.registry.getSupportedTypes();
    }

    /**
     * Para testes - limpa registry
     */
    public static reset(): void {
        this.registry.clear();
        this.initialized = false;
    }

    /**
     * Cria loader personalizado com configuração específica
     */
    public static createConfiguredLoader<T extends IConfigLoader>(
        type: string, 
        configFn: (loader: IConfigLoader) => T
    ): T {
        const baseLoader = this.getLoader(type);
        return configFn(baseLoader);
    }
}