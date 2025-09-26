import * as vscode from 'vscode';
import { ReviewComment } from '../models/ReviewComment';

export class CommentDetailPanel {
    public static currentPanel: CommentDetailPanel | undefined;
    public static readonly viewType = 'commentDetailPanel';
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _comment: ReviewComment;
    private _commentManager?: any;

    public static createOrShow(extensionUri: vscode.Uri, comment: ReviewComment, commentManager?: any) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // 如果已经有面板，直接显示并更新内容
        if (CommentDetailPanel.currentPanel) {
            CommentDetailPanel.currentPanel._panel.reveal(column);
            CommentDetailPanel.currentPanel._updateContent(comment);
            return;
        }

        // 否则创建新面板
        const panel = vscode.window.createWebviewPanel(
            CommentDetailPanel.viewType,
            '评审意见详情',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources')]
            }
        );

        CommentDetailPanel.currentPanel = new CommentDetailPanel(panel, extensionUri, comment, commentManager);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        CommentDetailPanel.currentPanel = new CommentDetailPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, comment?: ReviewComment, commentManager?: any) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._comment = comment || {} as ReviewComment;
        this._commentManager = commentManager;

        // 设置面板内容
        if (comment) {
            this._updateContent(comment);
        }

        // 监听面板关闭事件
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // 处理来自webview的消息
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'close':
                        this._panel.dispose();
                        return;
                    case 'copy':
                        // 使用兼容的剪贴板 API
                        try {
                            const doc = await vscode.workspace.openTextDocument({
                                content: message.text,
                                language: 'plaintext'
                            });
                            await vscode.window.showTextDocument(doc);
                            vscode.window.showInformationMessage('内容已在新文档中打开，请手动复制');
                        } catch (error) {
                            vscode.window.showErrorMessage(`复制失败: ${error}`);
                        }
                        return;
                    case 'editConfirm':
                        this._handleEditConfirm();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private _updateContent(comment: ReviewComment) {
        console.log('=== CommentDetailPanel._updateContent 开始 ===');
        console.log('_updateContent: 接收到的评论数据:', comment);
        console.log('_updateContent: 确认结果:', comment.confirmResult);
        console.log('_updateContent: 确认时间:', comment.confirmDate);
        console.log('_updateContent: 指定确认人员:', comment.assignConfirmer);
        console.log('_updateContent: 实际确认人员:', comment.realConfirmer);
        
        this._comment = comment;
        this._panel.title = `评审意见详情 - ${comment.filePath}`;
        this._panel.webview.html = this._getHtmlForWebview(comment);
        
        console.log('_updateContent: 面板内容已更新');
        console.log('=== CommentDetailPanel._updateContent 结束 ===');
    }

    private _getHtmlForWebview(comment: ReviewComment): string {
        const typeMap: { [key: string]: string } = {
            '1': '问题',
            '2': '建议', 
            '3': '疑问'
        };

        const confirmResultMap: { [key: string]: string } = {
            'unconfirmed': '未确认',
            'confirmed': '已确认',
            'rejected': '已拒绝'
        };

        const typeName = typeMap[comment.type] || comment.type;
        const confirmResultName = confirmResultMap[comment.confirmResult] || comment.confirmResult;

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>评审意见详情</title>
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
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .info-item {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
        }
        
        .info-label {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 5px;
            font-size: 0.9em;
        }
        
        .info-value {
            color: var(--vscode-foreground);
            word-break: break-all;
        }
        
        .code-section {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .code-section h3 {
            margin: 0 0 10px 0;
            color: var(--vscode-textLink-foreground);
        }
        
        .code-content {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 10px;
            font-family: var(--vscode-editor-font-family);
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 200px;
            overflow-y: auto;
        }
        
        .comment-section {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .comment-section h3 {
            margin: 0 0 10px 0;
            color: var(--vscode-textLink-foreground);
        }
        
        .comment-content {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 10px;
            white-space: pre-wrap;
            word-break: break-all;
        }
        
        .actions {
            margin-top: 20px;
            text-align: right;
        }
        
        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            margin-left: 10px;
            cursor: pointer;
            font-size: 14px;
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
        
        .full-width {
            grid-column: 1 / -1;
        }
        
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .status-unconfirmed {
            background-color: var(--vscode-charts-orange);
            color: white;
        }
        
        .status-confirmed {
            background-color: var(--vscode-charts-green);
            color: white;
        }
        
        .status-rejected {
            background-color: var(--vscode-charts-red);
            color: white;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📝 评审意见详情</h1>
    </div>
    
    <div class="info-grid">
        <div class="info-item">
            <div class="info-label">ID</div>
            <div class="info-value">${comment.id}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label">文件路径</div>
            <div class="info-value">${comment.filePath}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label">代码行号</div>
            <div class="info-value">${comment.lineRange}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label">意见类型</div>
            <div class="info-value">${typeName}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label">检视人员</div>
            <div class="info-value">${comment.reviewer}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label">检视时间</div>
            <div class="info-value">${comment.reviewDate}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label">确认状态</div>
            <div class="info-value">
                <span class="status-badge status-${comment.confirmResult}">${confirmResultName}</span>
                <script>console.log('HTML渲染: 确认结果 = ${comment.confirmResult}, 显示名称 = ${confirmResultName}');</script>
            </div>
        </div>
        
        <div class="info-item">
            <div class="info-label">指定确认人员</div>
            <div class="info-value">${comment.assignConfirmer || '无'}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label">实际确认人员</div>
            <div class="info-value">${comment.realConfirmer || '无'}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label">确认时间</div>
            <div class="info-value">${comment.confirmDate || '无'}</div>
        </div>
        
        <div class="info-item full-width">
            <div class="info-label">确认说明</div>
            <div class="info-value">${comment.confirmNotes || '无'}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label">Git仓库</div>
            <div class="info-value">${comment.gitRepositoryName || '无'}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label">Git分支</div>
            <div class="info-value">${comment.gitBranchName || '无'}</div>
        </div>
    </div>
    
    <div class="code-section">
        <h3>📄 代码片段</h3>
        <div class="code-content">${this._escapeHtml(comment.content)}</div>
    </div>
    
    <div class="comment-section">
        <h3>💬 评审意见</h3>
        <div class="comment-content">${this._escapeHtml(comment.comment)}</div>
    </div>
    
    <div class="actions">
        <button class="btn btn-secondary" onclick="copyToClipboard()">📋 复制详情</button>
        <button class="btn btn-secondary" onclick="editConfirm()">✏️ 编辑确认信息</button>
        <button class="btn btn-secondary" onclick="closePanel()">❌ 关闭</button>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function closePanel() {
            vscode.postMessage({
                command: 'close'
            });
        }
        
        function copyToClipboard() {
            const content = \`评审意见详情：
            
ID: ${comment.id}
文件路径: ${comment.filePath}
代码行号: ${comment.lineRange}
代码片段: ${comment.content}
评审意见: ${comment.comment}
检视人员: ${comment.reviewer}
检视时间: ${comment.reviewDate}
意见类型: ${typeName}
指定确认人员: ${comment.assignConfirmer || '无'}
实际确认人员: ${comment.realConfirmer || '无'}
确认结果: ${confirmResultName}
确认说明: ${comment.confirmNotes || '无'}
确认时间: ${comment.confirmDate || '无'}
Git仓库: ${comment.gitRepositoryName || '无'}
Git分支: ${comment.gitBranchName || '无'}\`;
            
            vscode.postMessage({
                command: 'copy',
                text: content
            });
        }
        
        function editConfirm() {
            vscode.postMessage({
                command: 'editConfirm'
            });
        }
    </script>
</body>
</html>`;
    }

    private _handleEditConfirm() {
        console.log('=== CommentDetailPanel._handleEditConfirm 开始 ===');
        console.log('_handleEditConfirm: 当前评论数据:', this._comment);
        console.log('_handleEditConfirm: commentManager 状态:', !!this._commentManager);
        
        // 导入 EditConfirmPanel 并打开编辑面板
        const { EditConfirmPanel } = require('./EditConfirmPanel');
        EditConfirmPanel.createOrShow(this._extensionUri, this._comment, async (updatedComment: ReviewComment) => {
            console.log('=== CommentDetailPanel 保存回调开始 ===');
            console.log('保存回调: 接收到的更新评论:', updatedComment);
            console.log('保存回调: 更新前的评论:', this._comment);
            
            // 更新 ReviewCommentManager 中的数据
            if (this._commentManager) {
                console.log('保存回调: 开始更新 ReviewCommentManager 中的数据');
                await this._commentManager.updateComment(this._comment.id, updatedComment);
                console.log('保存回调: ReviewCommentManager 数据更新完成');
            } else {
                console.log('保存回调: 警告 - commentManager 不存在，无法更新数据');
            }
            
            // 更新当前面板的内容
            this._comment = updatedComment;
            console.log('保存回调: 更新后的评论:', this._comment);
            console.log('保存回调: 确认结果:', this._comment.confirmResult);
            console.log('保存回调: 确认时间:', this._comment.confirmDate);
            
            this._updateContent(updatedComment);
            console.log('保存回调: 面板内容已更新');
            
            // 通知外部更新
            console.log('保存回调: 执行刷新命令');
            vscode.commands.executeCommand('codeReviewHelper.refresh');
            console.log('=== CommentDetailPanel 保存回调结束 ===');
        }, this._commentManager);
        console.log('=== CommentDetailPanel._handleEditConfirm 结束 ===');
    }

    private _escapeHtml(text: string): string {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    public dispose() {
        CommentDetailPanel.currentPanel = undefined;

        // 清理资源
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}
