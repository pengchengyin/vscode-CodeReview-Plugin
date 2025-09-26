"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSnapshotPanel = void 0;
const vscode = require("vscode");
class FileSnapshotPanel {
    static createOrShow(extensionUri, comment) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // 如果已经有面板，直接显示并更新内容
        if (FileSnapshotPanel.currentPanel) {
            FileSnapshotPanel.currentPanel._panel.reveal(column);
            FileSnapshotPanel.currentPanel._updateContent(comment);
            return;
        }
        // 否则创建新面板
        const panel = vscode.window.createWebviewPanel(FileSnapshotPanel.viewType, '原始文件快照', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources')]
        });
        FileSnapshotPanel.currentPanel = new FileSnapshotPanel(panel, extensionUri, comment);
    }
    static revive(panel, extensionUri) {
        FileSnapshotPanel.currentPanel = new FileSnapshotPanel(panel, extensionUri);
    }
    constructor(panel, extensionUri, comment) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        // 设置面板内容
        if (comment) {
            this._updateContent(comment);
        }
        // 监听面板关闭事件
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // 处理来自webview的消息
        this._panel.webview.onDidReceiveMessage(async (message) => {
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
                    }
                    catch (error) {
                        vscode.window.showErrorMessage(`复制失败: ${error}`);
                    }
                    return;
                case 'save':
                    this._saveSnapshotToFile(message.content, comment?.filePath || 'snapshot.txt');
                    return;
            }
        }, null, this._disposables);
    }
    _updateContent(comment) {
        this._panel.title = `原始文件快照 - ${comment.filePath}`;
        this._panel.webview.html = this._getHtmlForWebview(comment);
    }
    _getHtmlForWebview(comment) {
        const snapshot = comment.fileSnapshot || '';
        const lines = snapshot.split('\n');
        const lineCount = lines.length;
        const charCount = snapshot.length;
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>原始文件快照</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }
        
        .header {
            background-color: var(--vscode-panel-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding: 15px 20px;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .header h1 {
            margin: 0 0 10px 0;
            color: var(--vscode-textLink-foreground);
            font-size: 1.3em;
        }
        
        .file-info {
            display: flex;
            gap: 20px;
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }
        
        .info-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .content-container {
            padding: 20px;
        }
        
        .code-editor {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: var(--vscode-editor-line-height);
            padding: 0;
            overflow: auto;
            max-height: calc(100vh - 200px);
            position: relative;
        }
        
        .line-numbers {
            background-color: var(--vscode-editorLineNumber-background);
            color: var(--vscode-editorLineNumber-foreground);
            border-right: 1px solid var(--vscode-panel-border);
            padding: 10px 8px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: var(--vscode-editor-line-height);
            user-select: none;
            text-align: right;
            min-width: 50px;
            position: sticky;
            left: 0;
            z-index: 10;
        }
        
        .code-content {
            padding: 10px;
            white-space: pre;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: var(--vscode-editor-line-height);
            overflow-x: auto;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        
        .code-wrapper {
            display: flex;
            overflow: auto;
        }
        
        .actions {
            position: sticky;
            bottom: 0;
            background-color: var(--vscode-panel-background);
            border-top: 1px solid var(--vscode-panel-border);
            padding: 15px 20px;
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
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        
        .empty-state h3 {
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
        }
        
        .search-box {
            margin-bottom: 15px;
        }
        
        .search-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        
        .search-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .highlight {
            background-color: var(--vscode-textPreformat-background);
            padding: 2px 4px;
            border-radius: 2px;
        }
        
        .code-line {
            display: block;
            min-height: 1.2em;
        }
        
        .code-line:hover {
            background-color: var(--vscode-editor-lineHighlightBackground);
        }
        
        .tab-indent {
            display: inline-block;
            width: 2em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📄 原始文件快照</h1>
        <div class="file-info">
            <div class="info-item">
                <span>📁</span>
                <span>文件: ${this._escapeHtml(comment.filePath)}</span>
            </div>
            <div class="info-item">
                <span>📏</span>
                <span>行数: ${lineCount}</span>
            </div>
            <div class="info-item">
                <span>🔤</span>
                <span>字符数: ${charCount}</span>
            </div>
            <div class="info-item">
                <span>📅</span>
                <span>快照时间: ${comment.reviewDate}</span>
            </div>
        </div>
    </div>
    
    <div class="content-container">
        ${snapshot ? `
            <div class="search-box">
                <input type="text" class="search-input" placeholder="搜索文件内容..." id="searchInput">
            </div>
            
            <div class="code-editor">
                <div class="code-wrapper">
                    <div class="line-numbers" id="lineNumbers"></div>
                    <div class="code-content" id="codeContent">${this._formatCodeContent(snapshot)}</div>
                </div>
            </div>
        ` : `
            <div class="empty-state">
                <h3>📭 没有文件快照</h3>
                <p>该评审意见没有保存原始文件快照</p>
            </div>
        `}
    </div>
    
    <div class="actions">
        <button class="btn btn-secondary" onclick="copyContent()">📋 复制内容</button>
        <button class="btn btn-secondary" onclick="saveToFile()">💾 保存到文件</button>
        <button class="btn btn-secondary" onclick="closePanel()">❌ 关闭</button>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const snapshot = \`${snapshot.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
        
        function closePanel() {
            vscode.postMessage({
                command: 'close'
            });
        }
        
        function copyContent() {
            vscode.postMessage({
                command: 'copy',
                text: snapshot
            });
        }
        
        function saveToFile() {
            vscode.postMessage({
                command: 'save',
                content: snapshot
            });
        }
        
        // 生成行号
        function generateLineNumbers() {
            const lines = snapshot.split('\n');
            const lineNumbers = document.getElementById('lineNumbers');
            if (lineNumbers) {
                lineNumbers.innerHTML = lines.map((_, index) => index + 1).join('\n');
            }
        }
        
        // 搜索功能
        function setupSearch() {
            const searchInput = document.getElementById('searchInput');
            const codeContent = document.getElementById('codeContent');
            
            if (!searchInput || !codeContent) return;
            
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const content = codeContent.textContent || '';
                
                if (searchTerm) {
                    const regex = new RegExp(\`(\${searchTerm})\`, 'gi');
                    const highlighted = content.replace(regex, '<span class="highlight">$1</span>');
                    codeContent.innerHTML = highlighted;
                } else {
                    codeContent.innerHTML = content;
                }
            });
        }
        
        // 初始化
        document.addEventListener('DOMContentLoaded', function() {
            generateLineNumbers();
            setupSearch();
        });
    </script>
</body>
</html>`;
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
    _formatCodeContent(text) {
        if (!text)
            return '';
        // 转义HTML特殊字符
        const escaped = this._escapeHtml(text);
        // 将每行包装在span中，便于行号对齐和悬停效果
        const lines = escaped.split('\n');
        return lines.map(line => {
            // 处理制表符
            const processedLine = line.replace(/\t/g, '<span class="tab-indent"></span>');
            return `<span class="code-line">${processedLine}</span>`;
        }).join('\n');
    }
    async _saveSnapshotToFile(content, fileName) {
        try {
            const fileUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(fileName),
                filters: {
                    '文本文件': ['txt'],
                    '所有文件': ['*']
                }
            });
            if (fileUri) {
                const fs = require('fs');
                fs.writeFileSync(fileUri.fsPath, content, 'utf8');
                vscode.window.showInformationMessage(`文件已保存到: ${fileUri.fsPath}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`保存文件失败: ${error}`);
        }
    }
    dispose() {
        FileSnapshotPanel.currentPanel = undefined;
        // 清理资源
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}
exports.FileSnapshotPanel = FileSnapshotPanel;
FileSnapshotPanel.viewType = 'fileSnapshotPanel';
//# sourceMappingURL=FileSnapshotPanel.js.map