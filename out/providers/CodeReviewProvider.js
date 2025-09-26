"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewCommentItem = exports.CodeReviewProvider = void 0;
const vscode = require("vscode");
class CodeReviewProvider {
    constructor(commentManager) {
        this.commentManager = commentManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    async refresh() {
        console.log('=== CodeReviewProvider.refresh 开始 ===');
        console.log('CodeReviewProvider: 开始刷新树数据');
        // 重新加载评论数据，确保获取最新状态
        await this.commentManager.reloadComments();
        const comments = this.commentManager.getComments();
        console.log('CodeReviewProvider: 刷新后的评论数量:', comments.length);
        console.log('CodeReviewProvider: 刷新后的评论数据:', comments);
        this._onDidChangeTreeData.fire();
        console.log('CodeReviewProvider: 树数据刷新事件已触发');
        console.log('=== CodeReviewProvider.refresh 结束 ===');
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        console.log('=== CodeReviewProvider.getChildren 开始 ===');
        if (!element) {
            // 根节点 - 显示所有评论
            const comments = this.commentManager.getComments();
            console.log('CodeReviewProvider: 获取到评论数量:', comments.length);
            console.log('CodeReviewProvider: 评论数据:', comments);
            const items = comments.map(comment => new ReviewCommentItem(comment, vscode.TreeItemCollapsibleState.None, this.commentManager));
            console.log('CodeReviewProvider: 创建的TreeItem数量:', items.length);
            console.log('=== CodeReviewProvider.getChildren 结束 ===');
            return Promise.resolve(items);
        }
        console.log('CodeReviewProvider: 非根节点，返回空数组');
        console.log('=== CodeReviewProvider.getChildren 结束 ===');
        return Promise.resolve([]);
    }
}
exports.CodeReviewProvider = CodeReviewProvider;
class ReviewCommentItem extends vscode.TreeItem {
    constructor(comment, collapsibleState, commentManager) {
        console.log('=== ReviewCommentItem 构造函数开始 ===');
        console.log('ReviewCommentItem: 评论数据:', comment);
        // 修复：传递正确的标签给父类，而不是评论内容
        const label = comment.comment || '无评论内容';
        super(label, collapsibleState);
        this.comment = comment;
        this.collapsibleState = collapsibleState;
        this.commentManager = commentManager;
        console.log('ReviewCommentItem: 标签:', label);
        this.tooltip = this.getTooltip();
        this.description = this.getDescription();
        this.contextValue = 'reviewComment';
        console.log('ReviewCommentItem: 工具提示:', this.tooltip);
        console.log('ReviewCommentItem: 描述:', this.description);
        // 设置图标
        this.iconPath = new vscode.ThemeIcon('comment');
        console.log('ReviewCommentItem: 图标路径:', this.iconPath);
        // 设置命令 - 传递完整的评论对象
        this.command = {
            command: 'codeReviewHelper.jumpToComment',
            title: '跳转到代码位置',
            arguments: [this] // 传递整个 ReviewCommentItem 对象
        };
        console.log('ReviewCommentItem: 命令:', this.command);
        console.log('=== ReviewCommentItem 构造函数结束 ===');
    }
    getTooltip() {
        const typeMap = { '1': '问题', '2': '建议', '3': '疑问' };
        const typeText = typeMap[this.comment.type] || this.comment.type;
        // 人员名称映射 - 从字段配置获取
        const reviewerName = this.getDisplayNameForUser(this.comment.reviewer) || this.comment.reviewer;
        const assignConfirmerName = this.getDisplayNameForUser(this.comment.assignConfirmer) || this.comment.assignConfirmer || '无';
        const realConfirmerName = this.getDisplayNameForUser(this.comment.realConfirmer) || this.comment.realConfirmer || '无';
        // 项目名称映射
        const projectMap = { '10000': 'nsrep-testframework', '10001': 'test', '10002': 'security-self-test-platform' };
        const projectName = projectMap[this.comment.projectId] || this.comment.projectId || '无';
        return `文件: ${this.comment.filePath}
行号: ${this.comment.lineRange}
检视人员: ${reviewerName}
检视时间: ${this.comment.reviewDate}
意见类型: ${typeText}
指定确认人员: ${assignConfirmerName}
实际确认人员: ${realConfirmerName}
确认结果: ${this.comment.confirmResult || '未确认'}
Git仓库: ${this.comment.gitRepositoryName || '无'}
Git分支: ${this.comment.gitBranchName || '无'}
项目信息: ${projectName}`;
    }
    getDescription() {
        const fileName = this.comment.filePath.split('/').pop() || this.comment.filePath;
        const typeMap = { '1': '问题', '2': '建议', '3': '疑问' };
        const typeText = typeMap[this.comment.type] || this.comment.type;
        // 人员名称映射 - 从字段配置获取
        const reviewerName = this.getDisplayNameForUser(this.comment.reviewer) || this.comment.reviewer;
        // 确认状态映射
        const confirmResultMap = { 'unconfirmed': '未确认', 'confirmed': '已确认', 'rejected': '已拒绝' };
        const confirmStatus = confirmResultMap[this.comment.confirmResult] || '未确认';
        return `${fileName} (${this.comment.lineRange}) - ${typeText} - ${reviewerName} - ${confirmStatus}`;
    }
    getDisplayNameForUser(userValue) {
        if (!userValue)
            return null;
        // 从 commentManager 获取字段配置
        const systemColumns = this.commentManager.getSystemColumns();
        if (!systemColumns || !systemColumns.columns) {
            return null;
        }
        // 查找检视人员字段的配置
        const reviewerColumn = systemColumns.columns.find((col) => col.columnCode === 'reviewer' || col.fieldName === 'reviewer' || col.fieldName === '检视人员');
        if (reviewerColumn && reviewerColumn.enumValues) {
            const userItem = reviewerColumn.enumValues.find((item) => item.value === userValue || item.id === userValue || item.account === userValue);
            if (userItem) {
                return userItem.showName || userItem.label || userItem.name || userItem.value;
            }
        }
        return null;
    }
}
exports.ReviewCommentItem = ReviewCommentItem;
//# sourceMappingURL=CodeReviewProvider.js.map