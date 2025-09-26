"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const vscode = require("vscode");
class ConfigManager {
    constructor(context) {
        this.context = context;
        this.config = vscode.workspace.getConfiguration('codeReviewHelper');
    }
    getGlobalConfig() {
        const serverAddress = this.config.get('serverAddress', '');
        const account = this.config.get('account', '');
        const networkMode = this.config.get('networkMode', false);
        console.log('ConfigManager: 读取配置信息');
        console.log('  - networkMode:', networkMode);
        console.log('  - serverAddress:', serverAddress);
        console.log('  - account:', account);
        return {
            versionType: networkMode ? 1 : 0,
            language: this.config.get('language', 'zh') === 'zh' ? 0 : 1,
            closeLineMark: false,
            serverAddress: serverAddress,
            account: account,
            pwd: this.config.get('password', ''),
            currentUserInfo: undefined,
            selectedServerProjectId: undefined,
            cachedProjectList: []
        };
    }
    async saveGlobalConfig(config) {
        console.log('ConfigManager: 保存配置信息');
        console.log('  - serverAddress:', config.serverAddress);
        console.log('  - account:', config.account);
        console.log('  - versionType:', config.versionType);
        await this.config.update('networkMode', config.versionType === 1, vscode.ConfigurationTarget.Global);
        await this.config.update('language', config.language === 0 ? 'zh' : 'en', vscode.ConfigurationTarget.Global);
        await this.config.update('serverAddress', config.serverAddress, vscode.ConfigurationTarget.Global);
        await this.config.update('account', config.account, vscode.ConfigurationTarget.Global);
        await this.config.update('password', config.pwd, vscode.ConfigurationTarget.Global);
        // 强制重新加载配置
        this.config = vscode.workspace.getConfiguration('codeReviewHelper');
        console.log('ConfigManager: 配置保存完成');
        // 验证配置是否正确保存
        const savedConfig = this.getGlobalConfig();
        console.log('ConfigManager: 验证保存的配置');
        console.log('  - serverAddress:', savedConfig.serverAddress);
        console.log('  - account:', savedConfig.account);
    }
    refreshConfig() {
        this.config = vscode.workspace.getConfiguration('codeReviewHelper');
        console.log('ConfigManager: 配置已刷新');
    }
    getRecentSelectedFileDir() {
        return this.context.globalState.get('recentSelectedFileDir', '');
    }
    async saveRecentSelectedFileDir(dir) {
        await this.context.globalState.update('recentSelectedFileDir', dir);
    }
    isNetworkMode() {
        return this.config.get('networkMode', false);
    }
    getServerAddress() {
        return this.config.get('serverAddress', '');
    }
    getAccount() {
        return this.config.get('account', '');
    }
    getPassword() {
        return this.config.get('password', '');
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map