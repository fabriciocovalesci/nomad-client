import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { 
    IHttpClient, 
    IHttpResponse, 
    IHttpRequestConfig, 
    IHttpClientConfig,
    IHttpsAgentFactory 
} from './interfaces/IHttpClient';
import { HttpsAgentFactory } from './factories/HttpsAgentFactory';


export class HttpClient implements IHttpClient {
    private client: AxiosInstance;

    /**
     * Constructor using Dependency Injection
     */
    constructor(
        config: IHttpClientConfig,
        private agentFactory: IHttpsAgentFactory = new HttpsAgentFactory()
    ) {
        this.client = this.createAxiosInstance(config);
    }

    /**
     * Factory method to create Axios instance (Template Method)
     */
    private createAxiosInstance(config: IHttpClientConfig): AxiosInstance {
        const httpsAgent = this.agentFactory.createAgent(config.tls);

        return axios.create({
            baseURL: config.baseURL,
            timeout: config.timeout || 30000,
            headers: {
                'Content-Type': 'application/json',
                ...config.headers
            },
            httpsAgent
        });
    }

    /**
     * Utility method to transform Axios response
     */
    private transformResponse<T>(response: AxiosResponse<T>): IHttpResponse<T> {
        return {
            data: response.data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers as Record<string, string>
        };
    }

    /**
     * Utility method to merge configurations
     */
    private mergeConfig(config?: IHttpRequestConfig): AxiosRequestConfig {
        if (!config) return {};

        return {
            headers: config.headers,
            params: config.params,
            timeout: config.timeout,
            ...config
        };
    }

    /**
     * GET request
     */
    public async get<T = any>(url: string, config?: IHttpRequestConfig): Promise<IHttpResponse<T>> {
        try {
            const response = await this.client.get<T>(url, this.mergeConfig(config));
            return this.transformResponse(response);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * POST request
     */
    public async post<T = any>(url: string, data?: any, config?: IHttpRequestConfig): Promise<IHttpResponse<T>> {
        try {
            const response = await this.client.post<T>(url, data, this.mergeConfig(config));
            return this.transformResponse(response);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * PUT request
     */
    public async put<T = any>(url: string, data?: any, config?: IHttpRequestConfig): Promise<IHttpResponse<T>> {
        try {
            const response = await this.client.put<T>(url, data, this.mergeConfig(config));
            return this.transformResponse(response);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * DELETE request
     */
    public async delete<T = any>(url: string, config?: IHttpRequestConfig): Promise<IHttpResponse<T>> {
        try {
            const response = await this.client.delete<T>(url, this.mergeConfig(config));
            return this.transformResponse(response);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * PATCH request
     */
    public async patch<T = any>(url: string, data?: any, config?: IHttpRequestConfig): Promise<IHttpResponse<T>> {
        try {
            const response = await this.client.patch<T>(url, data, this.mergeConfig(config));
            return this.transformResponse(response);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Centralized error handling
     */
    private handleError(error: any): Error {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message || error.message;
            const status = error.response?.status;
            return new Error(`HTTP Error ${status}: ${message}`);
        }
        
        return error instanceof Error ? error : new Error('Unknown HTTP error');
    }
}