"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCommentCommand = void 0;
const vscode = require("vscode");
const path = require("path");
const AddCommentDialog_1 = require("../components/AddCommentDialog");
class AddCommentCommand {
    constructor(commentManager) {
        this.commentManager = commentManager;
    }
    async execute() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('请先打开一个文件');
            return;
        }
        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showWarningMessage('请先选择要评审的代码');
            return;
        }
        const document = editor.document;
        const selectedText = document.getText(selection);
        const absolutePath = document.uri.fsPath;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        // 改进路径处理逻辑
        let filePath;
        if (workspaceFolder) {
            // 使用相对路径，但确保路径格式正确
            const relativePath = path.relative(workspaceFolder.uri.fsPath, absolutePath);
            // 确保路径使用正斜杠（跨平台兼容）
            filePath = relativePath.replace(/\\/g, '/');
        }
        else {
            // 如果没有工作区，使用文件名
            filePath = path.basename(absolutePath);
        }
        const startLine = selection.start.line + 1; // 转换为1基索引
        const endLine = selection.end.line + 1;
        console.log('AddCommentCommand: 绝对路径:', absolutePath);
        console.log('AddCommentCommand: 工作区文件夹:', workspaceFolder?.uri.fsPath);
        console.log('AddCommentCommand: 相对路径:', filePath);
        // 获取当前用户信息
        const config = this.commentManager['configManager'].getGlobalConfig();
        const reviewer = config.account || 'unknown';
        // 创建评审意见对象
        const comment = {
            id: '',
            filePath: filePath,
            lineRange: `${startLine} ~ ${endLine}`,
            startLine: startLine,
            endLine: endLine,
            content: selectedText,
            comment: '',
            reviewer: reviewer,
            reviewDate: '',
            type: '1',
            assignConfirmer: '',
            realConfirmer: '',
            confirmResult: 'unconfirmed',
            confirmNotes: '',
            confirmDate: '',
            gitRepositoryName: await this.getGitRepositoryName(),
            gitBranchName: await this.getGitBranchName(),
            fileSnapshot: document.getText()
        };
        // 使用弹框形式填写评审意见
        console.log('AddCommentCommand: 创建弹框对话框');
        const dialog = new AddCommentDialog_1.AddCommentDialog(comment, this.commentManager);
        console.log('AddCommentCommand: 等待用户填写表单...');
        const result = await dialog.show();
        console.log('AddCommentCommand: 弹框返回结果:', result);
        if (!result) {
            console.log('AddCommentCommand: 用户取消了操作');
            return;
        }
        // 使用更新后的评论数据
        const updatedComment = result;
        console.log('AddCommentCommand: 准备保存评论数据');
        try {
            console.log('准备添加评审意见:', updatedComment);
            await this.commentManager.addComment(updatedComment);
            console.log('评审意见添加成功');
            vscode.window.showInformationMessage('评审意见添加成功');
        }
        catch (error) {
            console.error('添加评审意见失败:', error);
            vscode.window.showErrorMessage(`添加评审意见失败: ${error}`);
        }
    }
    async getGitRepositoryName() {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (gitExtension && gitExtension.isActive) {
                const git = gitExtension.exports.getAPI(1);
                const repo = git.repositories[0];
                if (repo) {
                    const remote = repo.state.remotes.find((r) => r.name === 'origin');
                    if (remote && remote.fetchUrl) {
                        const url = remote.fetchUrl;
                        const match = url.match(/\/([^\/]+)\.git$/);
                        if (match) {
                            return match[1];
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('获取Git仓库名称失败:', error);
        }
        return '';
    }
    async getGitBranchName() {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (gitExtension && gitExtension.isActive) {
                const git = gitExtension.exports.getAPI(1);
                const repo = git.repositories[0];
                if (repo) {
                    return repo.state.HEAD?.name || '';
                }
            }
        }
        catch (error) {
            console.error('获取Git分支名称失败:', error);
        }
        return '';
    }
}
exports.AddCommentCommand = AddCommentCommand;
//# sourceMappingURL=AddCommentCommand.js.map