import * as vscode from 'vscode';
import { ReviewComment } from '../models/ReviewComment';

export class AddCommentDialog {
    private panel: vscode.WebviewPanel | undefined;
    private comment: ReviewComment;
    private resolve: ((value: ReviewComment | undefined) => void) | undefined;
    private commentManager?: any;

    constructor(comment: ReviewComment, commentManager?: any) {
        this.comment = comment;
        this.commentManager = commentManager;
    }

    public async show(): Promise<ReviewComment | undefined> {
        return new Promise(async (resolve) => {
            this.resolve = resolve;
            await this.createPanel();
        });
    }

    private async createPanel() {
        this.panel = vscode.window.createWebviewPanel(
            'addCommentDialog',
            '添加评审意见',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.webview.html = await this.getWebviewContent();
        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'save':
                        this.handleSave(message.data);
                        break;
                    case 'cancel':
                        this.handleCancel();
                        break;
                }
            }
        );

        this.panel.onDidDispose(() => {
            if (this.resolve) {
                this.resolve(undefined);
            }
        });
    }

    private handleSave(data: any) {
        console.log('AddCommentDialog: 收到保存数据:', data);
        
        // 更新评论数据
        this.comment.comment = data.comment || '';
        this.comment.type = data.type || '1';
        this.comment.assignConfirmer = data.assignConfirmer || '';
        this.comment.projectId = data.projectId || '';
        this.comment.reviewer = data.reviewer || '';
        
        console.log('AddCommentDialog: 更新后的评论数据:', this.comment);
        
        // 先保存 resolve 函数，避免被 onDidDispose 覆盖
        const resolve = this.resolve;
        this.resolve = undefined; // 防止 onDidDispose 再次调用
        
        if (this.panel) {
            this.panel.dispose();
        }
        
        if (resolve) {
            console.log('AddCommentDialog: 调用 resolve 返回数据');
            resolve(this.comment);
        }
    }

    private handleCancel() {
        if (this.panel) {
            this.panel.dispose();
        }
        
        if (this.resolve) {
            this.resolve(undefined);
        }
    }

    private async getUserList(): Promise<Array<{value: string, label: string}>> {
        try {
            // 使用统一的用户列表获取方法
            if (this.commentManager) {
                const userList = this.commentManager.getUserListFromColumns();
                if (userList.length > 0) {
                    console.log('getUserList: 从字段配置获取到用户列表:', userList);
                    return userList;
                }
            }
            
            console.log('getUserList: 没有找到用户列表，请确保字段配置中包含用户数据');
        } catch (error) {
            console.error('获取用户列表失败:', error);
        }
        
        // 返回空列表，不再使用假数据
        return [];
    }

    private async getProjectList(): Promise<Array<{value: string, label: string}>> {
        try {
            // 尝试从网络获取项目列表
            const { NetworkManager } = require('../managers/NetworkManager');
            const { ConfigManager } = require('../managers/ConfigManager');
            
            const configManager = new ConfigManager();
            const networkManager = new NetworkManager(configManager);
            
            if (configManager.isNetworkMode()) {
                const projects = await networkManager.getMyProjects();
                return projects.map((project: any) => ({
                    value: project.projectId?.toString() || project.id?.toString(),
                    label: project.projectName || project.name
                }));
            }
        } catch (error) {
            console.error('获取项目列表失败，使用默认列表:', error);
        }
        
        // 返回默认项目列表
        return [
            { value: '10000', label: 'nsrep-testframework' },
            { value: '10001', label: 'test' },
            { value: '10002', label: 'security-self-test-platform' }
        ];
    }

    private async getWebviewContent(): Promise<string> {
        const typeOptions = [
            { value: '1', label: '问题' },
            { value: '2', label: '建议' },
            { value: '3', label: '疑问' }
        ];

        // 获取用户列表和项目列表
        const userList = await this.getUserList();
        const projectList = await this.getProjectList();

        const typeOptionsHtml = typeOptions.map(option => 
            `<option value="${option.value}" ${this.comment.type === option.value ? 'selected' : ''}>${option.label}</option>`
        ).join('');

        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>添加评审意见</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }
        
        .form-container {
            max-width: 600px;
            margin: 0 auto;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: var(--vscode-foreground);
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 3px;
            font-family: inherit;
            font-size: inherit;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 80px;
        }
        
        .required {
            color: var(--vscode-errorForeground);
        }
        
        .button-group {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-widget-border);
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-family: inherit;
            font-size: inherit;
            min-width: 80px;
        }
        
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .info-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
        
        .file-info {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textBlockQuote-border);
            padding: 10px;
            margin-bottom: 20px;
        }
        
        .file-info h3 {
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
        }
        
        .file-info p {
            margin: 5px 0;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="form-container">
        <div class="file-info">
            <h3>代码评审信息</h3>
            <p><strong>文件路径:</strong> ${this.comment.filePath}</p>
            <p><strong>代码行号:</strong> ${this.comment.lineRange}</p>
            <p><strong>代码片段:</strong></p>
            <pre style="background-color: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 3px; margin: 5px 0; white-space: pre-wrap; word-wrap: break-word;">${this.comment.content}</pre>
        </div>
        
        <form id="commentForm">
            <div class="form-group">
                <label for="comment">评审意见 <span class="required">*</span></label>
                <textarea id="comment" name="comment" placeholder="请描述发现的问题或建议..." required>${this.comment.comment}</textarea>
                <div class="info-text">请详细描述发现的问题、建议或疑问</div>
            </div>
            
            <div class="form-group">
                <label for="type">意见类型 <span class="required">*</span></label>
                <select id="type" name="type" required>
                    ${typeOptionsHtml}
                </select>
                <div class="info-text">选择评审意见的类型</div>
            </div>
            
            <div class="form-group">
                <label for="reviewer">检视人员 <span class="required">*</span></label>
                <input type="text" id="reviewer" name="reviewer" value="${this.comment.reviewer}" placeholder="输入检视人员姓名" required>
                <div class="info-text">填写进行代码检视的人员姓名</div>
            </div>
            
            <div class="form-group">
                <label for="assignConfirmer">指定确认人员</label>
                <select id="assignConfirmer" name="assignConfirmer">
                    <option value="">请选择确认人员（可选）</option>
                    ${userList.map(user => 
                        `<option value="${user.value}" ${this.comment.assignConfirmer === user.value ? 'selected' : ''}>${user.label}</option>`
                    ).join('')}
                </select>
                <div class="info-text">选择负责确认此评审意见的人员（可选）</div>
            </div>
            
            <div class="form-group">
                <label for="projectId">项目信息</label>
                <select id="projectId" name="projectId">
                    <option value="">请选择项目（可选）</option>
                    ${projectList.map(project => 
                        `<option value="${project.value}" ${this.comment.projectId === project.value ? 'selected' : ''}>${project.label}</option>`
                    ).join('')}
                </select>
                <div class="info-text">选择项目（可选）</div>
            </div>
            
            <div class="button-group">
                <button type="button" class="btn btn-secondary" id="cancelBtn">取消</button>
                <button type="submit" class="btn btn-primary" id="saveBtn">保存</button>
            </div>
        </form>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        document.getElementById('commentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                comment: formData.get('comment'),
                type: formData.get('type'),
                reviewer: formData.get('reviewer'),
                assignConfirmer: formData.get('assignConfirmer'),
                projectId: formData.get('projectId')
            };
            
            // 验证必填字段
            if (!data.comment || !data.reviewer) {
                alert('请填写必填字段');
                return;
            }
            
            vscode.postMessage({
                command: 'save',
                data: data
            });
        });
        
        document.getElementById('cancelBtn').addEventListener('click', () => {
            vscode.postMessage({
                command: 'cancel'
            });
        });
        
        // 自动调整textarea高度
        const textarea = document.getElementById('comment');
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    </script>
</body>
</html>`;
    }
}
