import * as vscode from 'vscode';
import { ConfigManager } from '../managers/ConfigManager';

export class SettingsCommand {
    constructor(private configManager: ConfigManager) {}

    async execute(): Promise<void> {
        const config = this.configManager.getGlobalConfig();
        
        // 显示设置选项
        const items = [
            {
                label: '$(gear) 基本设置',
                description: '配置服务器地址、账号密码等',
                command: 'openBasicSettings'
            },
            {
                label: '$(cloud) 网络模式',
                description: config.versionType === 1 ? '当前: 网络模式' : '当前: 本地模式',
                command: 'toggleNetworkMode'
            },
            {
                label: '$(globe) 语言设置',
                description: config.language === 0 ? '当前: 中文' : '当前: English',
                command: 'toggleLanguage'
            },
            {
                label: '$(sync) 同步配置',
                description: '从服务器拉取最新配置',
                command: 'syncConfig'
            },
            {
                label: '$(browser) 打开服务端',
                description: '在浏览器中打开服务端界面',
                command: 'openServer'
            }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: '选择设置选项'
        });

        if (!selected) {
            return;
        }

        switch (selected.command) {
            case 'openBasicSettings':
                await this.openBasicSettings();
                break;
            case 'toggleNetworkMode':
                await this.toggleNetworkMode();
                break;
            case 'toggleLanguage':
                await this.toggleLanguage();
                break;
            case 'syncConfig':
                await this.syncConfig();
                break;
            case 'openServer':
                await this.openServer();
                break;
        }
    }

    private async openBasicSettings(): Promise<void> {
        const config = this.configManager.getGlobalConfig();
        
        // 输入服务器地址
        const serverAddress = await vscode.window.showInputBox({
            prompt: '服务器地址',
            value: config.serverAddress,
            placeHolder: ''
        });

        if (serverAddress === undefined || serverAddress.trim() === '') {
            vscode.window.showWarningMessage('服务器地址不能为空');
            return;
        }

        // 输入账号
        const account = await vscode.window.showInputBox({
            prompt: '登录账号',
            value: config.account,
            placeHolder: ''
        });

        if (account === undefined || account.trim() === '') {
            vscode.window.showWarningMessage('登录账号不能为空');
            return;
        }

        // 输入密码
        const password = await vscode.window.showInputBox({
            prompt: '登录密码',
            value: config.pwd,
            password: true,
            placeHolder: ''
        });

        if (password === undefined || password.trim() === '') {
            vscode.window.showWarningMessage('登录密码不能为空');
            return;
        }

        // 测试连接
        const testConnection = await vscode.window.showQuickPick([
            { label: '是', value: true },
            { label: '否', value: false }
        ], {
            placeHolder: '是否测试连接？'
        });

        if (testConnection?.value) {
            vscode.window.showInformationMessage('正在测试连接...');
            // 这里可以添加实际的连接测试逻辑
        }

        // 保存配置
        const newConfig = {
            ...config,
            serverAddress,
            account,
            pwd: password
        };

        console.log('SettingsCommand: 准备保存配置');
        console.log('  - serverAddress:', serverAddress);
        console.log('  - account:', account);
        console.log('  - password:', password ? '[已输入]' : '[未输入]');

        await this.configManager.saveGlobalConfig(newConfig);
        vscode.window.showInformationMessage('设置保存成功');
    }

    private async toggleNetworkMode(): Promise<void> {
        const config = this.configManager.getGlobalConfig();
        const newMode = config.versionType === 1 ? 0 : 1;
        
        const newConfig = {
            ...config,
            versionType: newMode
        };

        await this.configManager.saveGlobalConfig(newConfig);
        
        const modeText = newMode === 1 ? '网络模式' : '本地模式';
        vscode.window.showInformationMessage(`已切换到${modeText}`);
    }

    private async toggleLanguage(): Promise<void> {
        const config = this.configManager.getGlobalConfig();
        const newLanguage = config.language === 0 ? 1 : 0;
        
        const newConfig = {
            ...config,
            language: newLanguage
        };

        await this.configManager.saveGlobalConfig(newConfig);
        
        const languageText = newLanguage === 0 ? '中文' : 'English';
        vscode.window.showInformationMessage(`语言已切换为${languageText}`);
    }

    private async syncConfig(): Promise<void> {
        try {
            // 检查网络模式
            if (!this.configManager.isNetworkMode()) {
                vscode.window.showWarningMessage('当前不是网络模式，请先启用网络模式');
                return;
            }

            // 显示进度
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '正在同步服务器配置...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });
                
                // 导入必要的模块
                const { NetworkManager } = require('../managers/NetworkManager');
                const { ReviewCommentManager } = require('../managers/ReviewCommentManager');
                
                // 创建网络管理器
                const networkManager = new NetworkManager(this.configManager);
                
                // 测试连接
                progress.report({ increment: 20, message: '测试服务器连接...' });
                const isConnected = await networkManager.testConnection();
                if (!isConnected) {
                    throw new Error('无法连接到服务器，请检查网络设置');
                }

                // 测试登录
                progress.report({ increment: 20, message: '验证用户身份...' });
                const isLoggedIn = await networkManager.testLogin();
                if (!isLoggedIn) {
                    throw new Error('用户身份验证失败，请检查账号密码');
                }

                // 拉取字段配置
                progress.report({ increment: 30, message: '拉取字段配置...' });
                console.log('开始拉取字段配置...');
                const columnConfigs = await networkManager.pullColumnConfigs();
                console.log('拉取到的字段配置:', columnConfigs);
                
                // 保存字段配置到全局状态
                progress.report({ increment: 20, message: '保存配置到本地...' });
                const context = this.configManager['context'];
                const commentManager = new ReviewCommentManager(context, this.configManager, networkManager);
                await commentManager.saveSystemColumns(columnConfigs);
                
                // 获取项目列表
                progress.report({ increment: 10, message: '获取项目列表...' });
                const projects = await networkManager.getMyProjects();
                console.log('获取到的项目列表:', projects);
                
                progress.report({ increment: 100 });
            });

            vscode.window.showInformationMessage('服务器配置同步完成！');
        } catch (error) {
            console.error('同步配置失败:', error);
            vscode.window.showErrorMessage(`同步配置失败: ${error}`);
        }
    }

    private async openServer(): Promise<void> {
        const config = this.configManager.getGlobalConfig();
        const { exec } = require('child_process');
        
        const platform = process.platform;
        let command: string;
        
        if (platform === 'win32') {
            command = `start ${config.serverAddress}`;
        } else if (platform === 'darwin') {
            command = `open ${config.serverAddress}`;
        } else {
            command = `xdg-open ${config.serverAddress}`;
        }
        
        exec(command, (error: any) => {
            if (error) {
                vscode.window.showErrorMessage('打开浏览器失败');
            }
        });
    }
}
