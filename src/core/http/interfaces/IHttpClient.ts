import { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Interface for standardized HTTP response
 */
export interface IHttpResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
}

/**
 * Interface for request configuration
 */
export interface IHttpRequestConfig {
    headers?: Record<string, string>;
    params?: Record<string, any>;
    timeout?: number;
    retries?: number;
    [key: string]: any;
}

/**
 * Main HTTP Client interface (Interface Segregation Principle)
 */
export interface IHttpClient {
    get<T = any>(url: string, config?: IHttpRequestConfig): Promise<IHttpResponse<T>>;
    post<T = any>(url: string, data?: any, config?: IHttpRequestConfig): Promise<IHttpResponse<T>>;
    put<T = any>(url: string, data?: any, config?: IHttpRequestConfig): Promise<IHttpResponse<T>>;
    delete<T = any>(url: string, config?: IHttpRequestConfig): Promise<IHttpResponse<T>>;
    patch<T = any>(url: string, data?: any, config?: IHttpRequestConfig): Promise<IHttpResponse<T>>;
}

/**
 * Interface for TLS configuration
 */
export interface ITLSConfig {
    caCertPath?: string;
    clientCertPath?: string;
    clientKeyPath?: string;
    rejectUnauthorized?: boolean;
}

/**
 * Interface for HTTP client configuration
 */
export interface IHttpClientConfig {
    baseURL: string;
    timeout?: number;
    headers?: Record<string, string>;
    tls?: ITLSConfig;
}

/**
 * Interface for HTTPS agent factory (Dependency Inversion)
 */
export interface IHttpsAgentFactory {
    createAgent(tlsConfig?: ITLSConfig): any;
}