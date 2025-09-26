"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkManager = void 0;
const axios_1 = require("axios");
const Version_1 = require("../consts/Version");
class NetworkManager {
    constructor(configManager) {
        this.TIMEOUT = 30000;
        this.configManager = configManager;
    }
    buildAuthHeaders() {
        const config = this.configManager.getGlobalConfig();
        const headers = {
            'account': config.account,
            'pwd': this.md5(config.pwd),
            'version': (0, Version_1.getPluginVersion)()
        };
        console.log('构建认证头：', headers);
        return headers;
    }
    md5(str) {
        // 简单的MD5实现，实际项目中应该使用crypto库
        try {
            const crypto = eval('require')('crypto');
            return crypto.createHash('md5').update(str).digest('hex');
        }
        catch (error) {
            // 如果crypto不可用，返回原始字符串
            return str;
        }
    }
    getFullUrl(path) {
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
    async doGet(path) {
        const url = this.getFullUrl(path);
        console.log('发起GET请求，目标地址：', url);
        try {
            const response = await axios_1.default.get(url, {
                headers: this.buildAuthHeaders(),
                timeout: this.TIMEOUT
            });
            console.log('服务端响应数据：', response.data);
            if (response.data.code !== 0) {
                throw new Error(response.data.message);
            }
            return response.data;
        }
        catch (error) {
            console.error('网络请求失败：', error);
            throw error;
        }
    }
    async doPost(path, body) {
        const url = this.getFullUrl(path);
        console.log('发起POST请求，目标地址：', url);
        try {
            const response = await axios_1.default.post(url, body, {
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
        }
        catch (error) {
            console.error('网络请求失败：', error);
            throw error;
        }
    }
    async testConnection() {
        try {
            // 使用GET请求进行连接测试
            await this.doGet('client/system/checkConnection');
            return true;
        }
        catch (error) {
            console.error('连接测试失败:', error);
            return false;
        }
    }
    async testLogin() {
        try {
            // 使用POST请求进行身份验证
            const config = this.configManager.getGlobalConfig();
            const authData = {
                account: config.account,
                password: this.md5(config.pwd)
            };
            await this.doPost('client/system/checkAuth', authData);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async pullColumnConfigs() {
        // 使用GET请求获取字段配置
        const response = await this.doGet('client/system/pullColumnDefines');
        return response.data;
    }
    async getMyProjects() {
        // 使用GET请求获取项目列表
        const response = await this.doGet('client/project/getMyProjects');
        return response.data;
    }
    async getUserList() {
        // 不再使用独立的用户列表接口，统一通过字段配置获取
        console.log('getUserList: 不再使用独立的用户列表接口，请使用字段配置中的用户数据');
        return [];
    }
    async commitComments(commitComment) {
        const response = await this.doPost('client/comment/commitComments', commitComment);
        return response.data;
    }
    async queryComments(queryParams) {
        const response = await this.doPost('client/comment/queryList', queryParams);
        return response.data;
    }
    openBrowser(url) {
        const config = this.configManager.getGlobalConfig();
        const targetUrl = url || config.serverAddress;
        try {
            const { exec } = eval('require')('child_process');
            const platform = process.platform;
            let command;
            if (platform === 'win32') {
                command = `start ${targetUrl}`;
            }
            else if (platform === 'darwin') {
                command = `open ${targetUrl}`;
            }
            else {
                command = `xdg-open ${targetUrl}`;
            }
            exec(command, (error) => {
                if (error) {
                    console.error('打开浏览器失败：', error);
                }
            });
        }
        catch (error) {
            console.error('打开浏览器失败：', error);
        }
    }
}
exports.NetworkManager = NetworkManager;
//# sourceMappingURL=NetworkManager.js.map