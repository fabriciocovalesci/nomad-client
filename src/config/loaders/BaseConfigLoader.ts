import { IConfigLoader, ILoadResult } from '../interfaces/IConfigLoader';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Classe base abstrata para loaders (Template Method Pattern + Open/Closed Principle)
 * Implementa comportamento comum e define métodos abstratos para implementações específicas
 */
export abstract class BaseConfigLoader<T = any> implements IConfigLoader<T> {
    protected abstract readonly supportedExtensions: string[];
    protected abstract readonly format: string;

    /**
     * Template method que define o fluxo de carregamento
     */
    public async load(filePath: string): Promise<T> {
        await this.validateFile(filePath);
        const content = await this.readFile(filePath);
        const parsedData = await this.parseContent(content);
        const validatedData = await this.validateContent(parsedData);
        
        return validatedData;
    }

    /**
     * Carrega arquivo e retorna resultado completo
     */
    public async loadWithMetadata(filePath: string): Promise<ILoadResult<T>> {
        const data = await this.load(filePath);
        
        return {
            data,
            filePath,
            format: this.format,
            loadedAt: new Date()
        };
    }

    public canHandle(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedExtensions.includes(ext);
    }

    public getSupportedExtensions(): string[] {
        return [...this.supportedExtensions];
    }

    /**
     * Métodos abstratos que devem ser implementados pelas classes filhas
     */
    protected abstract parseContent(content: string): Promise<T>;
    
    /**
     * Validação específica do conteúdo (pode ser sobrescrito)
     */
    protected async validateContent(data: T): Promise<T> {
        return data;
    }

    /**
     * Métodos protegidos para uso das classes filhas
     */
    protected async validateFile(filePath: string): Promise<void> {
        if (!filePath) {
            throw new Error('File path is required');
        }

        if (!this.canHandle(filePath)) {
            throw new Error(`File extension not supported. Supported: ${this.supportedExtensions.join(', ')}`);
        }

        try {
            await fs.access(filePath);
        } catch (error) {
            throw new Error(`File not found or not accessible: ${filePath}`);
        }
    }

    protected async readFile(filePath: string): Promise<string> {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            throw new Error(`Failed to read file: ${filePath}. ${error}`);
        }
    }
}