"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditConfirmPanel = void 0;
const vscode = require("vscode");
class EditConfirmPanel {
    static createOrShow(extensionUri, comment, onSave, commentManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // 如果已经有面板，直接显示并更新内容
        if (EditConfirmPanel.currentPanel) {
            EditConfirmPanel.currentPanel._panel.reveal(column);
            EditConfirmPanel.currentPanel._updateContent(comment, onSave);
            return;
        }
        // 否则创建新面板
        const panel = vscode.window.createWebviewPanel(EditConfirmPanel.viewType, '编辑确认信息', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources')]
        });
        EditConfirmPanel.currentPanel = new EditConfirmPanel(panel, extensionUri, comment, onSave, commentManager);
    }
    static revive(panel, extensionUri) {
        EditConfirmPanel.currentPanel = new EditConfirmPanel(panel, extensionUri);
    }
    constructor(panel, extensionUri, comment, onSave, commentManager) {
        this._disposables = [];
        this._comment = {};
        console.log('=== EditConfirmPanel 构造函数开始 ===');
        console.log('EditConfirmPanel: 接收到的 commentManager:', !!commentManager);
        console.log('EditConfirmPanel: commentManager 类型:', typeof commentManager);
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._onSaveCallback = onSave;
        this._commentManager = commentManager;
        console.log('EditConfirmPanel: 设置后的 _commentManager:', !!this._commentManager);
        console.log('=== EditConfirmPanel 构造函数结束 ===');
        // 设置面板内容
        if (comment) {
            this._comment = comment;
            this._updateContent(comment, onSave).catch(error => {
                console.error('更新面板内容失败:', error);
                vscode.window.showErrorMessage(`加载编辑面板失败: ${error}`);
            });
        }
        // 监听面板关闭事件
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // 处理来自webview的消息
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'close':
                    this._panel.dispose();
                    return;
                case 'save':
                    this._handleSave(message.data);
                    return;
                case 'cancel':
                    this._panel.dispose();
                    return;
            }
        }, null, this._disposables);
    }
    async _updateContent(comment, onSave) {
        console.log('=== EditConfirmPanel._updateContent 开始 ===');
        console.log('_updateContent: 当前 _commentManager 状态:', !!this._commentManager);
        this._comment = comment;
        this._onSaveCallback = onSave;
        this._panel.title = `编辑确认信息 - ${comment.filePath}`;
        console.log('_updateContent: 开始生成 HTML 内容');
        this._panel.webview.html = await this._getHtmlForWebview(comment);
        console.log('=== EditConfirmPanel._updateContent 结束 ===');
    }
    _handleSave(data) {
        console.log('=== EditConfirmPanel._handleSave 开始 ===');
        console.log('_handleSave: 接收到的数据:', data);
        console.log('_handleSave: 原始评论数据:', this._comment);
        try {
            const updatedComment = {
                ...this._comment,
                assignConfirmer: data.assignConfirmer || '',
                realConfirmer: data.realConfirmer || '',
                confirmResult: data.confirmResult || 'unconfirmed',
                confirmNotes: data.confirmNotes || '',
                confirmDate: data.confirmResult !== 'unconfirmed' ? new Date().toISOString() : this._comment.confirmDate
            };
            console.log('_handleSave: 更新后的评论数据:', updatedComment);
            console.log('_handleSave: 确认结果字段:', updatedComment.confirmResult);
            console.log('_handleSave: 确认时间字段:', updatedComment.confirmDate);
            if (this._onSaveCallback) {
                console.log('_handleSave: 调用保存回调函数');
                this._onSaveCallback(updatedComment);
                console.log('_handleSave: 保存回调函数调用完成');
            }
            else {
                console.log('_handleSave: 警告 - 没有保存回调函数');
            }
            vscode.window.showInformationMessage('确认信息已保存');
            this._panel.dispose();
            console.log('=== EditConfirmPanel._handleSave 结束 ===');
        }
        catch (error) {
            console.error('_handleSave: 保存失败:', error);
            vscode.window.showErrorMessage(`保存失败: ${error}`);
        }
    }
    async _getHtmlForWebview(comment) {
        const confirmResultOptions = [
            { value: 'unconfirmed', label: '未确认' },
            { value: 'confirmed', label: '已确认' },
            { value: 'rejected', label: '已拒绝' }
        ];
        // 获取当前用户信息和用户列表
        console.log('_getHtmlForWebview: 开始获取用户信息');
        const currentUser = this._getCurrentUser();
        console.log('_getHtmlForWebview: 当前用户:', currentUser);
        console.log('_getHtmlForWebview: 开始获取用户列表');
        const userList = await this._getUserList();
        console.log('_getHtmlForWebview: 获取到的用户列表:', userList);
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>编辑确认信息</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        
        .header {
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        
        .header h1 {
            margin: 0 0 10px 0;
            color: var(--vscode-textLink-foreground);
            font-size: 1.5em;
        }
        
        .form-container {
            max-width: 600px;
            margin: 0 auto;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 8px;
            font-size: 0.9em;
        }
        
        .form-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            box-sizing: border-box;
        }
        
        .form-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .form-select {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            box-sizing: border-box;
        }
        
        .form-select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .form-textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            min-height: 100px;
            resize: vertical;
            box-sizing: border-box;
        }
        
        .form-textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .info-section {
            background-color: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .info-section h3 {
            margin: 0 0 10px 0;
            color: var(--vscode-textLink-foreground);
            font-size: 1.1em;
        }
        
        .info-item {
            display: flex;
            margin-bottom: 5px;
        }
        
        .info-label {
            font-weight: bold;
            min-width: 80px;
            color: var(--vscode-descriptionForeground);
        }
        
        .info-value {
            color: var(--vscode-foreground);
        }
        
        .actions {
            margin-top: 30px;
            text-align: right;
            border-top: 1px solid var(--vscode-panel-border);
            padding-top: 20px;
        }
        
        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 10px 20px;
            margin-left: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        }
        
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .btn-success {
            background-color: var(--vscode-charts-green);
            color: white;
        }
        
        .btn-success:hover {
            background-color: var(--vscode-charts-green);
            opacity: 0.8;
        }
        
        .required {
            color: var(--vscode-errorForeground);
        }
        
        .help-text {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>✏️ 编辑确认信息</h1>
    </div>
    
    <div class="form-container">
        <div class="info-section">
            <h3>📝 评审意见信息</h3>
            <div class="info-item">
                <span class="info-label">文件:</span>
                <span class="info-value">${this._escapeHtml(comment.filePath)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">行号:</span>
                <span class="info-value">${comment.lineRange}</span>
            </div>
            <div class="info-item">
                <span class="info-label">评审人:</span>
                <span class="info-value">${comment.reviewer}</span>
            </div>
            <div class="info-item">
                <span class="info-label">评审时间:</span>
                <span class="info-value">${comment.reviewDate}</span>
            </div>
        </div>
        
        <form id="confirmForm">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label" for="assignConfirmer">指定确认人员</label>
                    <select id="assignConfirmer" 
                            name="assignConfirmer" 
                            class="form-select">
                        <option value="">请选择指定确认人员</option>
                        ${userList.map(user => `<option value="${user.value}" ${comment.assignConfirmer === user.value ? 'selected' : ''}>${user.label}</option>`).join('')}
                    </select>
                    <div class="help-text">选择负责确认此评审意见的人员</div>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="realConfirmer">实际确认人员</label>
                    <input type="text" 
                           id="realConfirmer" 
                           name="realConfirmer" 
                           class="form-input" 
                           value="${this._escapeHtml(currentUser)}"
                           readonly
                           style="background-color: var(--vscode-inputOption-background); color: var(--vscode-inputOption-foreground);">
                    <div class="help-text">当前登录用户（自动设置）</div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="confirmResult">确认结果 <span class="required">*</span></label>
                <select id="confirmResult" name="confirmResult" class="form-select" required>
                    ${confirmResultOptions.map(option => `<option value="${option.value}" ${comment.confirmResult === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}
                </select>
                <div class="help-text">选择评审意见的确认状态</div>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="confirmNotes">确认说明</label>
                <textarea id="confirmNotes" 
                          name="confirmNotes" 
                          class="form-textarea" 
                          placeholder="请输入确认说明或备注信息">${this._escapeHtml(comment.confirmNotes || '')}</textarea>
                <div class="help-text">详细说明确认结果的原因或补充信息</div>
            </div>
        </form>
        
        <div class="actions">
            <button type="button" class="btn btn-secondary" onclick="cancelEdit()">❌ 取消</button>
            <button type="button" class="btn btn-success" onclick="saveConfirm()">💾 保存确认信息</button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function cancelEdit() {
            vscode.postMessage({
                command: 'cancel'
            });
        }
        
        function saveConfirm() {
            const form = document.getElementById('confirmForm');
            const formData = new FormData(form);
            
            const data = {
                assignConfirmer: formData.get('assignConfirmer') || '',
                realConfirmer: formData.get('realConfirmer') || '',
                confirmResult: formData.get('confirmResult') || 'unconfirmed',
                confirmNotes: formData.get('confirmNotes') || ''
            };
            
            // 验证必填字段
            if (!data.confirmResult) {
                alert('请选择确认结果');
                return;
            }
            
            vscode.postMessage({
                command: 'save',
                data: data
            });
        }
        
        // 表单验证
        document.getElementById('confirmForm').addEventListener('input', function() {
            const confirmResult = document.getElementById('confirmResult').value;
            const saveBtn = document.querySelector('.btn-success');
            
            if (confirmResult) {
                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
            } else {
                saveBtn.disabled = true;
                saveBtn.style.opacity = '0.5';
            }
        });
        
        // 初始化按钮状态
        document.addEventListener('DOMContentLoaded', function() {
            const confirmResult = document.getElementById('confirmResult').value;
            const saveBtn = document.querySelector('.btn-success');
            
            if (confirmResult) {
                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
            } else {
                saveBtn.disabled = true;
                saveBtn.style.opacity = '0.5';
            }
        });
    </script>
</body>
</html>`;
    }
    _getCurrentUser() {
        // 从配置中获取当前用户
        const config = this._extensionUri ?
            vscode.workspace.getConfiguration('codeReviewHelper') :
            null;
        return config?.get('account') || 'unknown';
    }
    async _getUserList() {
        console.log('=== EditConfirmPanel._getUserList 开始 ===');
        try {
            console.log('_getUserList: 检查 commentManager 是否存在:', !!this._commentManager);
            if (this._commentManager) {
                console.log('_getUserList: commentManager 存在，开始获取用户列表');
                const userList = this._commentManager.getUserListFromColumns();
                console.log('_getUserList: getUserListFromColumns 返回结果:', userList);
                console.log('_getUserList: 用户列表长度:', userList.length);
                if (userList.length > 0) {
                    console.log('_getUserList: 成功获取到用户列表:', userList);
                    return userList;
                }
                else {
                    console.log('_getUserList: 用户列表为空');
                }
            }
            else {
                console.log('_getUserList: commentManager 不存在');
            }
            console.log('_getUserList: 没有找到用户列表，请确保字段配置中包含用户数据');
        }
        catch (error) {
            console.error('_getUserList: 获取用户列表失败:', error);
        }
        console.log('_getUserList: 返回空列表');
        console.log('=== EditConfirmPanel._getUserList 结束 ===');
        return [];
    }
    _escapeHtml(text) {
        if (!text)
            return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    dispose() {
        EditConfirmPanel.currentPanel = undefined;
        // 清理资源
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}
exports.EditConfirmPanel = EditConfirmPanel;
EditConfirmPanel.viewType = 'editConfirmPanel';
//# sourceMappingURL=EditConfirmPanel.js.map