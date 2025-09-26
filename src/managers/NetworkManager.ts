import axios, { AxiosResponse } from 'axios';
import { ConfigManager } from './ConfigManager';
import { Response, CommitComment, CommitResult, ServerProjectShortInfo, RecordColumns, ReviewQueryParams } from '../models/ReviewComment';
import { getPluginVersion } from '../consts/Version';

export class NetworkManager {
    private configManager: ConfigManager;
    private readonly TIMEOUT = 30000;

    constructor(configManager: ConfigManager) {
        this.configManager = configManager;
    }

    private buildAuthHeaders(): Record<string, string> {
        const config = this.configManager.getGlobalConfig();
        const headers = {
            'account': config.account,
            'pwd': this.md5(config.pwd),
            'version': getPluginVersion()
        };
        console.log('构建认证头：', headers);
        return headers;
    }

    private md5(str: string): string {
        // 简单的MD5实现，实际项目中应该使用crypto库
        try {
            const crypto = eval('require')('crypto');
            return crypto.createHash('md5').update(str).digest('hex');
        } catch (error) {
            // 如果crypto不可用，返回原始字符串
            return str;
        }
    }

    private getFullUrl(path: string): string {
        const config = this.configManager.getGlobalConfig();
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        
        // 检查服务器地址是否配置
        if (!config.serverAddress || config.serverAddress.trim() === '') {
            throw new Error('服务器地址未配置，请先在设置中配置服务器信息');
        }
        
        // 确保服务器地址以 / 结尾
        const serverAddress = config.serverAddress.endsWith('/') ? config.serverAddress : config.serverAddress + '/';
        return serverAddress + path;
    }

    public async doGet<T>(path: string): Promise<Response<T>> {
        const url = this.getFullUrl(path);
        console.log('发起GET请求，目标地址：', url);
        
        try {
            const response: AxiosResponse<Response<T>> = await axios.get(url, {
                headers: this.buildAuthHeaders(),
                timeout: this.TIMEOUT
            });
            
            console.log('服务端响应数据：', response.data);
            
            if (response.data.code !== 0) {
                throw new Error(response.data.message);
            }
            
            return response.data;
        } catch (error) {
            console.error('网络请求失败：', error);
            throw error;
        }
    }

    public async doPost<T, R>(path: string, body: T): Promise<Response<R>> {
        const url = this.getFullUrl(path);
        console.log('发起POST请求，目标地址：', url);
        
        try {
            const response: AxiosResponse<Response<R>> = await axios.post(url, body, {
                headers: {
                    ...this.buildAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                timeout: this.TIMEOUT
            });
            
            console.log('服务端响应数据：', response.data);
            
            if (response.data.code !== 0) {
                throw new Error(response.data.message);
            }
            
            return response.data;
        } catch (error) {
            console.error('网络请求失败：', error);
            throw error;
        }
    }

    public async testConnection(): Promise<boolean> {
        try {
            // 使用GET请求进行连接测试
            await this.doGet('client/system/checkConnection');
            return true;
        } catch (error) {
            console.error('连接测试失败:', error);
            return false;
        }
    }

    public async testLogin(): Promise<boolean> {
        try {
            // 使用POST请求进行身份验证
            const config = this.configManager.getGlobalConfig();
            const authData = {
                account: config.account,
                password: this.md5(config.pwd)
            };
            await this.doPost('client/system/checkAuth', authData);
            return true;
        } catch (error) {
            return false;
        }
    }

    public async pullColumnConfigs(): Promise<RecordColumns> {
        // 使用GET请求获取字段配置
        const response = await this.doGet<RecordColumns>('client/system/pullColumnDefines');
        return response.data;
    }

    public async getMyProjects(): Promise<ServerProjectShortInfo[]> {
        // 使用GET请求获取项目列表
        const response = await this.doGet<ServerProjectShortInfo[]>('client/project/getMyProjects');
        return response.data;
    }

    public async getUserList(): Promise<any[]> {
        // 不再使用独立的用户列表接口，统一通过字段配置获取
        console.log('getUserList: 不再使用独立的用户列表接口，请使用字段配置中的用户数据');
        return [];
    }

    public async commitComments(commitComment: CommitComment): Promise<CommitResult> {
        const response = await this.doPost<CommitComment, CommitResult>('client/comment/commitComments', commitComment);
        return response.data;
    }

    public async queryComments(queryParams: ReviewQueryParams): Promise<CommitComment> {
        const response = await this.doPost<ReviewQueryParams, CommitComment>('client/comment/queryList', queryParams);
        return response.data;
    }

    public openBrowser(url?: string): void {
        const config = this.configManager.getGlobalConfig();
        const targetUrl = url || config.serverAddress;
        
        try {
            const { exec } = eval('require')('child_process');
            const platform = process.platform;
            
            let command: string;
            if (platform === 'win32') {
                command = `start ${targetUrl}`;
            } else if (platform === 'darwin') {
                command = `open ${targetUrl}`;
            } else {
                command = `xdg-open ${targetUrl}`;
            }
            
            exec(command, (error: any) => {
                if (error) {
                    console.error('打开浏览器失败：', error);
                }
            });
        } catch (error) {
            console.error('打开浏览器失败：', error);
        }
    }
}
