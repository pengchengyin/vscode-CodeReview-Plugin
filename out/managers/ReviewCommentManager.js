"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewCommentManager = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const ExcelProcessor_1 = require("../utils/ExcelProcessor");
class ReviewCommentManager {
    constructor(context, configManager, networkManager) {
        this.comments = [];
        this.lineMarkers = [];
        this.systemColumns = null;
        this.context = context;
        this.configManager = configManager;
        this.networkManager = networkManager;
        this.loadComments();
        this.loadSystemColumns();
    }
    loadComments() {
        console.log('loadComments: 开始加载评论数据');
        const commentsData = this.context.globalState.get('reviewComments', []);
        console.log('loadComments: 从全局状态加载的评论数量:', commentsData.length);
        console.log('loadComments: 加载的评论数据:', commentsData);
        this.comments = commentsData;
        console.log('loadComments: 评论数据加载完成');
    }
    async reloadComments() {
        console.log('reloadComments: 开始重新加载评论数据');
        this.loadComments();
        console.log('reloadComments: 评论数据重新加载完成');
    }
    async saveComments() {
        console.log('saveComments: 开始保存评论数据');
        console.log('saveComments: 当前评论数量:', this.comments.length);
        console.log('saveComments: 评论数据:', this.comments);
        await this.context.globalState.update('reviewComments', this.comments);
        console.log('saveComments: 评论数据已保存到全局状态');
    }
    loadSystemColumns() {
        // 首先尝试从全局状态加载服务端字段配置
        const savedColumns = this.context.globalState.get('systemColumns');
        if (savedColumns) {
            console.log('从全局状态加载字段配置:', savedColumns);
            this.systemColumns = savedColumns;
            return;
        }
        // 如果没有服务端配置，加载本地默认字段配置
        const systemColumnsPath = path.join(__dirname, '../../resources/SystemColumns.json');
        try {
            if (fs.existsSync(systemColumnsPath)) {
                const data = fs.readFileSync(systemColumnsPath, 'utf8');
                this.systemColumns = JSON.parse(data);
                console.log('从本地文件加载字段配置:', this.systemColumns);
            }
        }
        catch (error) {
            console.error('加载系统字段配置失败：', error);
        }
    }
    getComments() {
        return this.comments;
    }
    getSystemColumns() {
        return this.systemColumns;
    }
    async saveSystemColumns(columns) {
        console.log('保存服务端字段配置:', columns);
        this.systemColumns = columns;
        await this.context.globalState.update('systemColumns', columns);
        console.log('字段配置已保存到全局状态');
    }
    getUserListFromColumns() {
        console.log('=== ReviewCommentManager.getUserListFromColumns 开始 ===');
        console.log('getUserListFromColumns: systemColumns 是否存在:', !!this.systemColumns);
        if (!this.systemColumns) {
            console.log('getUserListFromColumns: systemColumns 为 null');
            return [];
        }
        console.log('getUserListFromColumns: systemColumns.columns 是否存在:', !!this.systemColumns.columns);
        if (!this.systemColumns.columns) {
            console.log('getUserListFromColumns: systemColumns.columns 为 null');
            return [];
        }
        console.log('getUserListFromColumns: 字段配置中的列数量:', this.systemColumns.columns.length);
        console.log('getUserListFromColumns: 所有列的 columnCode:', this.systemColumns.columns.map((col) => col.columnCode));
        // 查找检视人员字段的配置
        const reviewerColumn = this.systemColumns.columns.find((col) => col.columnCode === 'reviewer' || col.fieldName === 'reviewer' || col.fieldName === '检视人员');
        console.log('getUserListFromColumns: 是否找到检视人员字段:', !!reviewerColumn);
        if (reviewerColumn) {
            console.log('getUserListFromColumns: 检视人员字段详情:', {
                columnCode: reviewerColumn.columnCode,
                showName: reviewerColumn.showName,
                hasEnumValues: !!(reviewerColumn.enumValues),
                enumValuesLength: reviewerColumn.enumValues ? reviewerColumn.enumValues.length : 0
            });
        }
        if (reviewerColumn && reviewerColumn.enumValues) {
            console.log('getUserListFromColumns: 从字段配置获取用户列表:', reviewerColumn.enumValues);
            const userList = reviewerColumn.enumValues.map((item) => ({
                value: item.value || item.id || item.account,
                label: item.showName || item.label || item.name || item.value || item.id || item.account
            }));
            console.log('getUserListFromColumns: 转换后的用户列表:', userList);
            console.log('=== ReviewCommentManager.getUserListFromColumns 结束 ===');
            return userList;
        }
        console.log('getUserListFromColumns: 字段配置中没有找到用户列表');
        console.log('=== ReviewCommentManager.getUserListFromColumns 结束 ===');
        return [];
    }
    getDisplayNameForUser(userValue) {
        if (!this.systemColumns || !this.systemColumns.columns) {
            return null;
        }
        // 查找检视人员字段的配置
        const reviewerColumn = this.systemColumns.columns.find((col) => col.columnCode === 'reviewer' || col.fieldName === 'reviewer' || col.fieldName === '检视人员');
        if (reviewerColumn && reviewerColumn.enumValues) {
            const userItem = reviewerColumn.enumValues.find((item) => item.value === userValue || item.id === userValue || item.account === userValue);
            if (userItem) {
                return userItem.showName || userItem.label || userItem.name || userItem.value;
            }
        }
        return null;
    }
    async addComment(comment) {
        console.log('ReviewCommentManager: 开始添加评审意见');
        console.log('原始评论数据:', comment);
        comment.id = this.generateId();
        comment.reviewDate = new Date().toISOString();
        console.log('生成ID后的评论数据:', comment);
        this.comments.push(comment);
        console.log('当前评论总数:', this.comments.length);
        await this.saveComments();
        console.log('评论保存完成');
        this.refreshLineMarkers();
        console.log('行标记刷新完成');
    }
    async updateComment(id, updates) {
        console.log('=== ReviewCommentManager.updateComment 开始 ===');
        console.log('updateComment: 开始更新评论', { id, updates });
        console.log('updateComment: 当前评论总数:', this.comments.length);
        console.log('updateComment: 所有评论ID:', this.comments.map(c => c.id));
        const index = this.comments.findIndex(c => c.id === id);
        if (index !== -1) {
            console.log('updateComment: 找到评论，索引:', index);
            console.log('updateComment: 更新前的评论:', this.comments[index]);
            console.log('updateComment: 更新前的确认结果:', this.comments[index].confirmResult);
            console.log('updateComment: 更新前的确认时间:', this.comments[index].confirmDate);
            this.comments[index] = { ...this.comments[index], ...updates };
            console.log('updateComment: 更新后的评论:', this.comments[index]);
            console.log('updateComment: 更新后的确认结果:', this.comments[index].confirmResult);
            console.log('updateComment: 更新后的确认时间:', this.comments[index].confirmDate);
            await this.saveComments();
            console.log('updateComment: 评论已保存到全局状态');
            this.refreshLineMarkers();
            console.log('updateComment: 行标记已刷新');
        }
        else {
            console.error('updateComment: 未找到ID为', id, '的评论');
            console.error('updateComment: 可用的评论ID:', this.comments.map(c => c.id));
        }
        console.log('=== ReviewCommentManager.updateComment 结束 ===');
    }
    async deleteComment(id) {
        this.comments = this.comments.filter(c => c.id !== id);
        await this.saveComments();
        this.refreshLineMarkers();
    }
    async deleteComments(ids) {
        this.comments = this.comments.filter(c => !ids.includes(c.id));
        await this.saveComments();
        this.refreshLineMarkers();
    }
    async clearComments() {
        this.comments = [];
        await this.saveComments();
        this.refreshLineMarkers();
    }
    getCommentById(id) {
        return this.comments.find(c => c.id === id);
    }
    async exportToExcel(filePath) {
        const excelProcessor = new ExcelProcessor_1.ExcelProcessor();
        await excelProcessor.exportComments(this.comments, filePath);
    }
    async importFromExcel(filePath) {
        const excelProcessor = new ExcelProcessor_1.ExcelProcessor();
        const importedComments = await excelProcessor.importComments(filePath);
        this.comments.push(...importedComments);
        await this.saveComments();
        this.refreshLineMarkers();
    }
    async commitToServer(projectId) {
        if (!this.configManager.isNetworkMode()) {
            throw new Error('当前不是网络模式');
        }
        const commitComment = this.buildCommitComment();
        console.log('准备提交的评论数据:', commitComment);
        console.log('评论数量:', commitComment.comments.length);
        const result = await this.networkManager.commitComments(commitComment);
        console.log('提交结果:', result);
        // 更新本地评论的提交状态
        this.comments.forEach(comment => {
            if (comment.commitFlag === undefined || comment.commitFlag === 1) {
                comment.commitFlag = 0; // 标记为已提交
            }
        });
        await this.saveComments();
    }
    async pullFromServer(projectId, type) {
        if (!this.configManager.isNetworkMode()) {
            throw new Error('当前不是网络模式');
        }
        const queryParams = { projectId, type };
        console.log('拉取参数:', queryParams);
        const response = await this.networkManager.queryComments(queryParams);
        console.log('服务端返回的评论数据:', response);
        // 转换服务端数据格式
        const serverComments = response.comments.map(commentBody => this.convertServerComment(commentBody));
        console.log('转换后的评论数据:', serverComments);
        // 合并服务端数据到本地，而不是直接替换
        const existingIds = new Set(this.comments.map(c => c.id));
        const newComments = serverComments.filter(comment => !existingIds.has(comment.id));
        console.log('新增评论数量:', newComments.length);
        // 更新已存在的评论
        serverComments.forEach(serverComment => {
            const existingIndex = this.comments.findIndex(c => c.id === serverComment.id);
            if (existingIndex >= 0) {
                this.comments[existingIndex] = serverComment;
            }
        });
        // 添加新评论
        this.comments.push(...newComments);
        console.log('本地评论总数:', this.comments.length);
        await this.saveComments();
        this.refreshLineMarkers();
    }
    buildCommitComment() {
        console.log('buildCommitComment: 开始构建提交数据');
        const comments = this.comments
            .filter(comment => comment.commitFlag === undefined || comment.commitFlag === 1)
            .map(comment => {
            console.log('buildCommitComment: 处理评论:', comment);
            const commentBody = {
                id: comment.id,
                dataVersion: comment.dataVersion,
                values: {}
            };
            // 转换属性值 - 使用 comment.propValues 而不是直接遍历 comment
            if (comment.propValues) {
                comment.propValues.forEach((valuePair, key) => {
                    commentBody.values[key] = {
                        value: valuePair.value,
                        showName: valuePair.showName
                    };
                });
            }
            else {
                // 如果没有 propValues，从 comment 对象中提取字段
                const fields = ['filePath', 'lineRange', 'startLine', 'endLine', 'content', 'comment',
                    'reviewer', 'reviewDate', 'type', 'assignConfirmer', 'realConfirmer',
                    'confirmResult', 'confirmNotes', 'confirmDate', 'projectId',
                    'gitRepositoryName', 'gitBranchName', 'fileSnapshot'];
                // 添加必填字段 identifier 和 fileSnapshot
                commentBody.values['identifier'] = {
                    value: comment.id,
                    showName: comment.id
                };
                // 确保 fileSnapshot 字段存在
                commentBody.values['fileSnapshot'] = {
                    value: comment.fileSnapshot || '',
                    showName: comment.fileSnapshot || ''
                };
                fields.forEach(field => {
                    // 跳过已经处理的必填字段
                    if (field === 'identifier' || field === 'fileSnapshot') {
                        return;
                    }
                    const value = comment[field];
                    if (value !== undefined && value !== null) {
                        // 特殊处理 projectId，确保是数字类型，但显示项目名称
                        if (field === 'projectId') {
                            const numValue = parseInt(String(value));
                            if (!isNaN(numValue)) {
                                const projectMap = { '10000': 'nsrep-testframework', '10001': 'test', '10002': 'security-self-test-platform' };
                                const projectName = projectMap[String(numValue)] || String(numValue);
                                commentBody.values[field] = {
                                    value: numValue.toString(),
                                    showName: projectName
                                };
                            }
                        }
                        else {
                            // 特殊处理类型字段，显示中文名称
                            if (field === 'type') {
                                const typeMap = { '1': '问题', '2': '建议', '3': '疑问' };
                                const typeName = typeMap[String(value)] || String(value);
                                commentBody.values[field] = {
                                    value: String(value),
                                    showName: typeName
                                };
                            }
                            else if (field === 'reviewer') {
                                // 特殊处理 reviewer 字段，显示中文名称
                                const reviewerName = this.getDisplayNameForUser(String(value)) || String(value);
                                commentBody.values[field] = {
                                    value: String(value),
                                    showName: reviewerName
                                };
                            }
                            else {
                                commentBody.values[field] = {
                                    value: String(value),
                                    showName: String(value)
                                };
                            }
                        }
                    }
                });
            }
            console.log('buildCommitComment: 构建的评论体:', commentBody);
            console.log('buildCommitComment: identifier 字段:', commentBody.values['identifier']);
            console.log('buildCommitComment: fileSnapshot 字段:', commentBody.values['fileSnapshot']);
            return commentBody;
        });
        const result = { comments };
        console.log('buildCommitComment: 最终提交数据:', result);
        return result;
    }
    convertServerComment(commentBody) {
        console.log('转换服务端评论数据:', commentBody);
        console.log('values类型:', typeof commentBody.values);
        console.log('values是否为Map:', commentBody.values instanceof Map);
        const comment = {
            id: commentBody.id,
            filePath: '',
            lineRange: '',
            startLine: 0,
            endLine: 0,
            content: '',
            comment: '',
            reviewer: '',
            reviewDate: '',
            type: '',
            assignConfirmer: '',
            realConfirmer: '',
            confirmResult: '',
            confirmNotes: '',
            confirmDate: '',
            dataVersion: commentBody.dataVersion,
            commitFlag: 0
        };
        // 从values中提取属性
        if (commentBody.values) {
            if (commentBody.values instanceof Map) {
                // 如果是Map对象
                commentBody.values.forEach((valuePair, key) => {
                    comment[key] = valuePair.value;
                });
            }
            else {
                // 如果是普通对象
                Object.entries(commentBody.values).forEach(([key, valuePair]) => {
                    comment[key] = valuePair.value;
                });
            }
        }
        console.log('转换后的评论:', comment);
        return comment;
    }
    refreshLineMarkers() {
        console.log('=== ReviewCommentManager.refreshLineMarkers 开始 ===');
        console.log('refreshLineMarkers: 当前评论总数:', this.comments.length);
        // 清除现有标记
        this.lineMarkers.forEach(marker => marker.dispose());
        this.lineMarkers = [];
        console.log('refreshLineMarkers: 已清除现有标记');
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            console.log('refreshLineMarkers: 没有活动的文本编辑器');
            return;
        }
        const filePath = editor.document.uri.fsPath;
        console.log('refreshLineMarkers: 当前文件路径:', filePath);
        // 尝试多种路径匹配方式
        const fileComments = this.comments.filter(c => {
            const commentPath = c.filePath;
            console.log('refreshLineMarkers: 比较路径 - 当前:', filePath, '评论:', commentPath);
            // 1. 直接匹配
            if (commentPath === filePath) {
                console.log('refreshLineMarkers: 直接路径匹配成功');
                return true;
            }
            // 2. 检查是否为相对路径匹配
            if (commentPath && !path.isAbsolute(commentPath)) {
                // 尝试在工作区中查找相对路径
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    for (const workspaceFolder of workspaceFolders) {
                        const fullPath = path.join(workspaceFolder.uri.fsPath, commentPath);
                        if (fullPath === filePath) {
                            console.log('refreshLineMarkers: 相对路径匹配成功:', fullPath);
                            return true;
                        }
                    }
                }
            }
            // 3. 检查文件名匹配（作为备选方案）
            const currentFileName = path.basename(filePath);
            const commentFileName = path.basename(commentPath);
            if (currentFileName === commentFileName) {
                console.log('refreshLineMarkers: 文件名匹配成功:', currentFileName);
                return true;
            }
            return false;
        });
        console.log('refreshLineMarkers: 当前文件的评论数量:', fileComments.length);
        console.log('refreshLineMarkers: 当前文件的评论:', fileComments);
        if (fileComments.length === 0) {
            console.log('refreshLineMarkers: 当前文件没有评论，跳过标记创建');
            return;
        }
        // 检查图标文件路径 - 修复路径问题
        const extensionPath = path.join(__dirname, '../../');
        let iconPath = path.join(extensionPath, 'resources/icons/review.svg');
        console.log('refreshLineMarkers: 扩展路径:', extensionPath);
        console.log('refreshLineMarkers: 图标路径:', iconPath);
        console.log('refreshLineMarkers: __dirname:', __dirname);
        // 检查图标文件是否存在
        const fs = require('fs');
        let iconExists = fs.existsSync(iconPath);
        console.log('refreshLineMarkers: 图标文件是否存在:', iconExists);
        // 如果图标文件不存在，尝试其他路径
        if (!iconExists) {
            const altIconPath = path.join(__dirname, '../../../resources/icons/review.svg');
            console.log('refreshLineMarkers: 尝试备用图标路径:', altIconPath);
            const altIconExists = fs.existsSync(altIconPath);
            console.log('refreshLineMarkers: 备用图标文件是否存在:', altIconExists);
            if (altIconExists) {
                iconPath = altIconPath;
                iconExists = true;
            }
        }
        // 创建装饰类型 - 只在行号前显示图标，不侵入代码行
        const decorationType = vscode.window.createTextEditorDecorationType({
            gutterIconPath: iconPath,
            gutterIconSize: 'contain',
            // 添加点击事件处理
            light: {
                gutterIconPath: iconPath
            },
            dark: {
                gutterIconPath: iconPath
            }
        });
        console.log('refreshLineMarkers: 装饰类型已创建（仅行号前图标）');
        // 创建范围
        const ranges = [];
        fileComments.forEach((comment, index) => {
            const startLine = Math.max(0, comment.startLine - 1);
            const endLine = Math.max(0, comment.endLine - 1);
            console.log(`refreshLineMarkers: 评论 ${index + 1}:`, {
                id: comment.id,
                startLine: comment.startLine,
                endLine: comment.endLine,
                adjustedStartLine: startLine,
                adjustedEndLine: endLine
            });
            // 创建更详细的悬停消息
            const typeMap = { '1': '问题', '2': '建议', '3': '疑问' };
            const typeText = typeMap[comment.type] || comment.type;
            const confirmResultMap = { 'unconfirmed': '未确认', 'confirmed': '已确认', 'rejected': '已拒绝' };
            const confirmStatus = confirmResultMap[comment.confirmResult] || '未确认';
            const hoverMessage = new vscode.MarkdownString();
            hoverMessage.appendMarkdown(`## 📝 评审意见详情\n\n`);
            hoverMessage.appendMarkdown(`**意见类型**: ${typeText}\n\n`);
            hoverMessage.appendMarkdown(`**评审意见**: ${comment.comment}\n\n`);
            hoverMessage.appendMarkdown(`**检视人员**: ${comment.reviewer}\n\n`);
            hoverMessage.appendMarkdown(`**检视时间**: ${comment.reviewDate}\n\n`);
            hoverMessage.appendMarkdown(`**确认状态**: ${confirmStatus}\n\n`);
            if (comment.assignConfirmer) {
                hoverMessage.appendMarkdown(`**指定确认人员**: ${comment.assignConfirmer}\n\n`);
            }
            if (comment.realConfirmer) {
                hoverMessage.appendMarkdown(`**实际确认人员**: ${comment.realConfirmer}\n\n`);
            }
            if (comment.confirmNotes) {
                hoverMessage.appendMarkdown(`**确认说明**: ${comment.confirmNotes}\n\n`);
            }
            hoverMessage.appendMarkdown(`---\n\n`);
            hoverMessage.appendMarkdown(`*在左侧面板中点击此评论查看详细信息*`);
            const range = new vscode.Range(startLine, 0, endLine, 0);
            ranges.push({
                range,
                hoverMessage: hoverMessage
                // 不添加任何代码行内容，只在 gutter 显示图标
            });
        });
        console.log('refreshLineMarkers: 创建了', ranges.length, '个装饰范围');
        editor.setDecorations(decorationType, ranges);
        this.lineMarkers.push(decorationType);
        console.log('refreshLineMarkers: 装饰已应用到编辑器');
        console.log('=== ReviewCommentManager.refreshLineMarkers 结束 ===');
    }
    async jumpToComment(comment) {
        const filePath = comment.filePath;
        if (!filePath) {
            vscode.window.showWarningMessage('文件路径不存在');
            return;
        }
        console.log('jumpToComment: 开始跳转');
        console.log('jumpToComment: 文件路径:', filePath);
        console.log('jumpToComment: 行号:', comment.startLine);
        console.log('jumpToComment: 工作区:', vscode.workspace.workspaceFolders);
        try {
            let doc;
            let actualFilePath = filePath;
            // 如果是相对路径，尝试在所有工作区中查找文件
            if (!path.isAbsolute(filePath)) {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) {
                    throw new Error('没有找到工作区文件夹');
                }
                let found = false;
                const fs = require('fs');
                // 尝试在所有工作区文件夹中查找文件
                for (const workspaceFolder of workspaceFolders) {
                    // 尝试不同的路径格式
                    const possiblePaths = [
                        path.join(workspaceFolder.uri.fsPath, filePath),
                        path.join(workspaceFolder.uri.fsPath, filePath.replace(/\//g, path.sep)),
                        path.join(workspaceFolder.uri.fsPath, filePath.replace(/\\/g, path.sep))
                    ];
                    for (const fullPath of possiblePaths) {
                        console.log('jumpToComment: 尝试路径:', fullPath);
                        if (fs.existsSync(fullPath)) {
                            console.log('jumpToComment: 找到文件:', fullPath);
                            actualFilePath = fullPath;
                            found = true;
                            break;
                        }
                    }
                    if (found)
                        break;
                }
                if (!found) {
                    // 如果所有工作区都没找到，尝试使用第一个工作区并显示详细错误信息
                    const firstWorkspace = workspaceFolders[0];
                    const fullPath = path.join(firstWorkspace.uri.fsPath, filePath);
                    console.error('jumpToComment: 文件不存在:', fullPath);
                    // 尝试列出工作区目录以帮助调试
                    try {
                        const files = fs.readdirSync(firstWorkspace.uri.fsPath);
                        console.log('jumpToComment: 工作区根目录文件:', files.slice(0, 10));
                        // 尝试查找相似的文件名
                        const fileName = path.basename(filePath);
                        const similarFiles = files.filter((f) => f.includes(fileName) || fileName.includes(f));
                        if (similarFiles.length > 0) {
                            console.log('jumpToComment: 找到相似文件:', similarFiles);
                        }
                    }
                    catch (error) {
                        console.error('jumpToComment: 读取工作区目录失败:', error);
                    }
                    vscode.window.showErrorMessage(`文件不存在: ${fullPath}\n请检查文件路径是否正确，或文件是否已被移动或删除`);
                    return;
                }
                doc = await vscode.workspace.openTextDocument(actualFilePath);
            }
            else {
                // 绝对路径直接打开
                doc = await vscode.workspace.openTextDocument(filePath);
            }
            // 显示文档并跳转到指定行
            const editor = await vscode.window.showTextDocument(doc);
            const line = Math.max(0, comment.startLine - 1);
            const position = new vscode.Position(line, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
            console.log('jumpToComment: 跳转成功，行号:', line);
        }
        catch (error) {
            console.error('jumpToComment: 跳转失败:', error);
            vscode.window.showErrorMessage(`跳转失败: ${error}`);
        }
    }
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}
exports.ReviewCommentManager = ReviewCommentManager;
//# sourceMappingURL=ReviewCommentManager.js.map