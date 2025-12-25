import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { IncomingHttpHeaders } from 'http';
import logger from './logger';

class RequestContextAxios {
  private static instance: RequestContextAxios;
  private axiosInstance: AxiosInstance;
  private requestHeaders: IncomingHttpHeaders | null = null;

  private constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      maxRedirects: 5,
    });

    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.requestHeaders) {
          const forwardedHeaders = this.sanitizeHeaders(this.requestHeaders);
          
          config.headers = config.headers || {};
          Object.entries(forwardedHeaders).forEach(([key, value]) => {
            if (value !== undefined) {
              config.headers[key] = value;
            }
          });

          if (config.url) {
            try {
              const targetUrl = new URL(config.url);
              config.headers['host'] = targetUrl.host;
            } catch (error) {
              logger.error('Failed to parse target URL for host header', { url: config.url });
            }
          }
        }

        return config;
      },
      (error) => {
        logger.error('Axios request interceptor error', { error });
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNRESET') {
          logger.error('Connection reset by peer (ECONNRESET)', {
            url: error.config?.url,
            method: error.config?.method,
            message: error.message,
          });
        } else if (error.code === 'ETIMEDOUT') {
          logger.error('Request timeout', {
            url: error.config?.url,
            method: error.config?.method,
            timeout: error.config?.timeout,
          });
        } else if (error.code === 'ECONNREFUSED') {
          logger.error('Connection refused', {
            url: error.config?.url,
            method: error.config?.method,
          });
        }

        return Promise.reject(error);
      }
    );
  }

  private sanitizeHeaders(headers: IncomingHttpHeaders): Record<string, string | string[]> {
    const sanitized: Record<string, string | string[]> = {};
    const excludedHeaders = [
      'host',
      'connection',
      'content-length',
      'transfer-encoding',
      'expect',
    ];

    Object.entries(headers).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (!excludedHeaders.includes(lowerKey) && value !== undefined) {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  public static getInstance(): RequestContextAxios {
    if (!RequestContextAxios.instance) {
      RequestContextAxios.instance = new RequestContextAxios();
    }
    return RequestContextAxios.instance;
  }

  public setRequestHeaders(headers: IncomingHttpHeaders): void {
    this.requestHeaders = headers;
  }

  public clearRequestHeaders(): void {
    this.requestHeaders = null;
  }

  public getAxios(): AxiosInstance {
    return this.axiosInstance;
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<T>(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.patch<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export const axiosInstance = RequestContextAxios.getInstance();
export default axiosInstance;
