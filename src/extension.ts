import * as vscode from 'vscode';
import { CodeReviewProvider } from './providers/CodeReviewProvider';
import { ReviewCommentManager } from './managers/ReviewCommentManager';
import { NetworkManager } from './managers/NetworkManager';
import { ConfigManager } from './managers/ConfigManager';
import { AddCommentCommand } from './commands/AddCommentCommand';
import { SettingsCommand } from './commands/SettingsCommand';
import { CommentDetailPanel } from './components/CommentDetailPanel';
import { FileSnapshotPanel } from './components/FileSnapshotPanel';
import { EditConfirmPanel } from './components/EditConfirmPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('Code Review Helper extension is now active!');
    console.log('Extension context:', context.extensionPath);

    // 初始化管理器
    const configManager = new ConfigManager(context);
    const networkManager = new NetworkManager(configManager);
    const commentManager = new ReviewCommentManager(context, configManager, networkManager);
    
    // 注册数据提供者
    const provider = new CodeReviewProvider(commentManager);
    const providerDisposable = vscode.window.registerTreeDataProvider('codeReviewPanel', provider);

    // 注册命令
    const addCommentCommand = new AddCommentCommand(commentManager);
    const settingsCommand = new SettingsCommand(configManager);

    const addCommentDisposable = vscode.commands.registerCommand('codeReviewHelper.addComment', async () => {
        console.log('AddComment command triggered');
        await addCommentCommand.execute();
        await provider.refresh();
    });

    const openPanelDisposable = vscode.commands.registerCommand('codeReviewHelper.openPanel', () => {
        vscode.commands.executeCommand('codeReviewPanel.focus');
    });

    const settingsDisposable = vscode.commands.registerCommand('codeReviewHelper.settings', () => {
        settingsCommand.execute();
    });

    const jumpToCommentDisposable = vscode.commands.registerCommand('codeReviewHelper.jumpToComment', async (commentItem: any) => {
        console.log('jumpToComment: 接收到的参数:', commentItem);
        console.log('jumpToComment: 参数类型:', typeof commentItem);
        
        // 处理 ReviewCommentItem 对象
        let reviewComment;
        if (commentItem && commentItem.comment) {
            // 如果是 ReviewCommentItem 对象
            reviewComment = commentItem.comment;
        } else if (commentItem && typeof commentItem === 'object' && commentItem.filePath) {
            // 如果直接是 ReviewComment 对象
            reviewComment = commentItem;
        } else {
            console.error('jumpToComment: 无效的评论对象:', commentItem);
            vscode.window.showErrorMessage('无效的评论对象，无法跳转');
            return;
        }
        
        console.log('jumpToComment: 处理后的评论对象:', reviewComment);
        await commentManager.jumpToComment(reviewComment);
    });

    const exportCommentsDisposable = vscode.commands.registerCommand('codeReviewHelper.exportComments', async () => {
        try {
            const fileUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('代码评审意见.xlsx'),
                filters: {
                    'Excel文件': ['xlsx']
                }
            });
            
            if (fileUri) {
                await commentManager.exportToExcel(fileUri.fsPath);
                vscode.window.showInformationMessage('评审意见导出成功');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`导出失败: ${error}`);
        }
    });

    const importCommentsDisposable = vscode.commands.registerCommand('codeReviewHelper.importComments', async () => {
        try {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                filters: {
                    'Excel文件': ['xlsx']
                }
            });
            
            if (fileUri && fileUri.length > 0) {
                await commentManager.importFromExcel(fileUri[0].fsPath);
                await provider.refresh();
                vscode.window.showInformationMessage('评审意见导入成功');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`导入失败: ${error}`);
        }
    });

    const clearCommentsDisposable = vscode.commands.registerCommand('codeReviewHelper.clearComments', async () => {
        const result = await vscode.window.showWarningMessage(
            '确定要清空所有评审意见吗？此操作不可恢复！',
            '确定',
            '取消'
        );
        
        if (result === '确定') {
            await commentManager.clearComments();
            await provider.refresh();
            vscode.window.showInformationMessage('已清空所有评审意见');
        }
    });

    const commitToServerDisposable = vscode.commands.registerCommand('codeReviewHelper.commitToServer', async () => {
        try {
            // 刷新配置
            configManager.refreshConfig();

            // 检查网络模式
            if (!configManager.isNetworkMode()) {
                const enableNetwork = await vscode.window.showWarningMessage(
                    '当前不是网络模式，是否要启用网络模式？',
                    '启用网络模式',
                    '取消'
                );
                
                if (enableNetwork === '启用网络模式') {
                    await vscode.commands.executeCommand('codeReviewHelper.settings');
                    return;
                } else {
                    return;
                }
            }

            // 检查是否有评审意见
            const comments = commentManager.getComments();
            if (comments.length === 0) {
                vscode.window.showWarningMessage('没有评审意见需要推送');
                return;
            }

            // 显示确认对话框
            const confirm = await vscode.window.showWarningMessage(
                `确定要推送 ${comments.length} 条评审意见到服务器吗？`,
                '确定推送',
                '取消'
            );

            if (confirm !== '确定推送') {
                return;
            }

            // 显示进度
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '正在推送评审意见...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });
                
                // 测试连接
                progress.report({ increment: 20, message: '测试服务器连接...' });
                const networkManager = commentManager['networkManager'];
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

                // 先拉取字段配置
                progress.report({ increment: 10, message: '拉取字段配置...' });
                const columnConfigs = await networkManager.pullColumnConfigs();
                await commentManager.saveSystemColumns(columnConfigs);

                // 获取项目列表 - 强制刷新，不使用缓存
                progress.report({ increment: 10, message: '获取最新项目列表...' });
                console.log('正在获取最新项目列表...');
                const projects = await networkManager.getMyProjects();
                console.log('获取到的项目列表:', projects);
                
                if (projects.length === 0) {
                    throw new Error('没有可用的项目，请检查服务器配置或联系管理员');
                }

                // 选择项目
                progress.report({ increment: 20, message: '选择项目...' });
                const projectItems = projects.map((p: any) => ({
                    label: p.projectName,
                    description: `项目ID: ${p.projectId}`,
                    value: p.projectId,
                    detail: `项目名称: ${p.projectName}`
                }));

                // 按项目名称排序，方便查找
                projectItems.sort((a: any, b: any) => a.label.localeCompare(b.label));

                const selectedProject = await vscode.window.showQuickPick(projectItems, {
                    placeHolder: '选择要推送到的项目（显示所有可用项目）',
                    title: '选择项目',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (!selectedProject) {
                    throw new Error('未选择项目');
                }

                console.log('选择的项目:', selectedProject);

                // 推送评审意见
                progress.report({ increment: 30, message: '推送评审意见...' });
                await commentManager.commitToServer((selectedProject as any).value);
            });

            vscode.window.showInformationMessage('评审意见推送成功！');
            await provider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`推送失败: ${error}`);
        }
    });

           const pullFromServerDisposable = vscode.commands.registerCommand('codeReviewHelper.pullFromServer', async () => {
               try {
                   // 刷新配置
                   configManager.refreshConfig();

                   // 检查网络模式
                   if (!configManager.isNetworkMode()) {
                       const enableNetwork = await vscode.window.showWarningMessage(
                           '当前不是网络模式，是否要启用网络模式？',
                           '启用网络模式',
                           '取消'
                       );
                       
                       if (enableNetwork === '启用网络模式') {
                           await vscode.commands.executeCommand('codeReviewHelper.settings');
                           return;
                       } else {
                           return;
                       }
                   }

                   // 显示进度
                   await vscode.window.withProgress({
                       location: vscode.ProgressLocation.Notification,
                       title: '正在从服务器拉取评审意见...',
                       cancellable: false
                   }, async (progress) => {
                       progress.report({ increment: 0 });
                       
                       // 测试连接
                       progress.report({ increment: 20, message: '测试服务器连接...' });
                       const networkManager = commentManager['networkManager'];
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

                       // 先拉取字段配置
                       progress.report({ increment: 10, message: '拉取字段配置...' });
                       const columnConfigs = await networkManager.pullColumnConfigs();
                       await commentManager.saveSystemColumns(columnConfigs);

                       // 获取项目列表 - 强制刷新，不使用缓存
                       progress.report({ increment: 10, message: '获取最新项目列表...' });
                       console.log('正在获取最新项目列表...');
                       const projects = await networkManager.getMyProjects();
                       console.log('获取到的项目列表:', projects);
                       
                       if (projects.length === 0) {
                           throw new Error('没有可用的项目，请检查服务器配置或联系管理员');
                       }

                       // 选择项目
                       progress.report({ increment: 20, message: '选择项目...' });
                       const projectItems = projects.map((p: any) => ({
                           label: p.projectName,
                           description: `项目ID: ${p.projectId}`,
                           value: p.projectId,
                           detail: `项目名称: ${p.projectName}`
                       }));

                       // 按项目名称排序，方便查找
                       projectItems.sort((a: any, b: any) => a.label.localeCompare(b.label));

                       const selectedProject = await vscode.window.showQuickPick(projectItems, {
                           placeHolder: '选择要拉取的项目（显示所有可用项目）',
                           title: '选择项目',
                           matchOnDescription: true,
                           matchOnDetail: true
                       });

                       if (!selectedProject) {
                           throw new Error('未选择项目');
                       }

                       // 选择类型
                       progress.report({ increment: 20, message: '选择类型...' });
                       const typeItems = [
                           { label: '所有类型', value: 'all' },
                           { label: '问题', value: '1' },
                           { label: '建议', value: '2' },
                           { label: '疑问', value: '3' }
                       ];

                       const selectedType = await vscode.window.showQuickPick(typeItems, {
                           placeHolder: '选择要拉取的类型',
                           title: '选择类型'
                       });

                       if (!selectedType) {
                           throw new Error('未选择类型');
                       }

                       // 拉取评审意见
                       progress.report({ increment: 20, message: '拉取评审意见...' });
                       await commentManager.pullFromServer((selectedProject as any).value, (selectedType as any).value);
                   });

                   await provider.refresh();
                   vscode.window.showInformationMessage('从服务端拉取成功！');
               } catch (error) {
                   vscode.window.showErrorMessage(`拉取失败: ${error}`);
               }
           });

           const deleteCommentDisposable = vscode.commands.registerCommand('codeReviewHelper.deleteComment', async (comment: any) => {
               if (!comment) {
                   vscode.window.showWarningMessage('请选择要删除的评审意见');
                   return;
               }

               // 处理 ReviewCommentItem 对象
               const reviewComment = comment.comment || comment;
               console.log('deleteComment: 接收到的评论对象:', reviewComment);

               const result = await vscode.window.showWarningMessage(
                   `确定要删除这条评审意见吗？\n文件: ${reviewComment.filePath}\n行号: ${reviewComment.lineRange}`,
                   '确定删除',
                   '取消'
               );

               if (result === '确定删除') {
                   try {
                       await commentManager.deleteComment(reviewComment.id);
                       await provider.refresh();
                       vscode.window.showInformationMessage('评审意见删除成功');
                   } catch (error) {
                       vscode.window.showErrorMessage(`删除失败: ${error}`);
                   }
               }
           });

           const showCommentDetailDisposable = vscode.commands.registerCommand('codeReviewHelper.showCommentDetail', async (comment: any) => {
               if (!comment) {
                   vscode.window.showWarningMessage('请选择要查看的评审意见');
                   return;
               }

               // 处理 ReviewCommentItem 对象
               const reviewComment = comment.comment || comment;
               console.log('showCommentDetail: 接收到的评论对象:', reviewComment);

               // 使用 WebView 面板显示详情
               CommentDetailPanel.createOrShow(context.extensionUri, reviewComment, commentManager);
           });

    const showOriginalSnapshotDisposable = vscode.commands.registerCommand('codeReviewHelper.showOriginalSnapshot', async (comment: any) => {
        if (!comment) {
            vscode.window.showWarningMessage('请选择要查看的评审意见');
            return;
        }

        // 处理 ReviewCommentItem 对象
        const reviewComment = comment.comment || comment;
        console.log('showOriginalSnapshot: 接收到的评论对象:', reviewComment);

        if (!reviewComment.fileSnapshot) {
            vscode.window.showWarningMessage('该评审意见没有保存文件快照');
            return;
        }

        // 使用 WebView 面板显示原始快照
        FileSnapshotPanel.createOrShow(context.extensionUri, reviewComment);
    });

    const editConfirmDisposable = vscode.commands.registerCommand('codeReviewHelper.editConfirm', async (comment: any) => {
        if (!comment) {
            vscode.window.showWarningMessage('请选择要编辑的评审意见');
            return;
        }

        // 处理 ReviewCommentItem 对象
        const reviewComment = comment.comment || comment;
        console.log('editConfirm: 接收到的评论对象:', reviewComment);

        // 使用 WebView 面板编辑确认信息
        EditConfirmPanel.createOrShow(context.extensionUri, reviewComment, async (updatedComment) => {
            try {
                console.log('准备更新确认信息:', updatedComment);
                
                // 只更新确认相关的字段，避免覆盖其他重要字段
                const updates = {
                    assignConfirmer: updatedComment.assignConfirmer,
                    realConfirmer: updatedComment.realConfirmer,
                    confirmResult: updatedComment.confirmResult,
                    confirmNotes: updatedComment.confirmNotes,
                    confirmDate: updatedComment.confirmDate
                };
                
                await commentManager.updateComment(updatedComment.id, updates);
                console.log('确认信息更新成功');
                
                // 强制刷新所有相关界面
                await provider.refresh();
                commentManager.refreshLineMarkers();
                
                vscode.window.showInformationMessage('确认信息已更新');
            } catch (error) {
                console.error('更新确认信息失败:', error);
                vscode.window.showErrorMessage(`更新失败: ${error}`);
            }
        }, commentManager);
    });

    // 添加刷新项目列表命令
    // 添加刷新命令
    const refreshDisposable = vscode.commands.registerCommand('codeReviewHelper.refresh', async () => {
        console.log('=== codeReviewHelper.refresh 命令开始 ===');
        console.log('refresh: 开始刷新评论数据');
        await provider.refresh();
        console.log('refresh: 评论数据刷新完成');
        console.log('=== codeReviewHelper.refresh 命令结束 ===');
    });

    // 添加点击 gutter 图标打开详情面板的命令
    const openCommentDetailDisposable = vscode.commands.registerCommand('codeReviewHelper.openCommentDetail', async (commentId: string) => {
        console.log('=== codeReviewHelper.openCommentDetail 命令开始 ===');
        console.log('openCommentDetail: 评论ID:', commentId);
        
        const comment = commentManager.getCommentById(commentId);
        if (comment) {
            console.log('openCommentDetail: 找到评论，打开详情面板');
            CommentDetailPanel.createOrShow(context.extensionUri, comment, commentManager);
        } else {
            console.log('openCommentDetail: 未找到评论');
            vscode.window.showWarningMessage('未找到指定的评审意见');
        }
        console.log('=== codeReviewHelper.openCommentDetail 命令结束 ===');
    });

    const refreshProjectsDisposable = vscode.commands.registerCommand('codeReviewHelper.refreshProjects', async () => {
        try {
            // 刷新配置
            configManager.refreshConfig();

            // 检查网络模式
            if (!configManager.isNetworkMode()) {
                const enableNetwork = await vscode.window.showWarningMessage(
                    '当前不是网络模式，是否要启用网络模式？',
                    '启用网络模式',
                    '取消'
                );
                
                if (enableNetwork === '启用网络模式') {
                    await vscode.commands.executeCommand('codeReviewHelper.settings');
                    return;
                } else {
                    return;
                }
            }

            // 显示进度
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '正在刷新项目列表...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });
                
                // 测试连接
                progress.report({ increment: 30, message: '测试服务器连接...' });
                const networkManager = commentManager['networkManager'];
                const isConnected = await networkManager.testConnection();
                if (!isConnected) {
                    throw new Error('无法连接到服务器，请检查网络设置');
                }

                // 测试登录
                progress.report({ increment: 30, message: '验证用户身份...' });
                const isLoggedIn = await networkManager.testLogin();
                if (!isLoggedIn) {
                    throw new Error('用户身份验证失败，请检查账号密码');
                }

                // 获取最新项目列表
                progress.report({ increment: 40, message: '获取最新项目列表...' });
                const projects = await networkManager.getMyProjects();
                console.log('刷新后的项目列表:', projects);
                
                if (projects.length === 0) {
                    throw new Error('没有可用的项目');
                }

                // 显示项目列表
                const projectList = projects.map((p: any) => `• ${p.projectName} (ID: ${p.projectId})`).join('\n');
                vscode.window.showInformationMessage(`项目列表已刷新，共找到 ${projects.length} 个项目：\n${projectList}`);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`刷新项目列表失败: ${error}`);
        }
    });

    // 添加字段配置调试命令
    const debugColumnConfigDisposable = vscode.commands.registerCommand('codeReviewHelper.debugColumnConfig', async () => {
        try {
            console.log('=== 字段配置调试开始 ===');
            
            // 检查当前字段配置
            const systemColumns = commentManager.getSystemColumns();
            console.log('当前字段配置:', systemColumns);
            
            if (!systemColumns) {
                vscode.window.showWarningMessage('没有字段配置！请先同步服务器配置。');
                return;
            }
            
            if (!systemColumns.columns) {
                vscode.window.showWarningMessage('字段配置中没有 columns 字段！');
                return;
            }
            
            console.log('字段配置中的列数量:', systemColumns.columns.length);
            console.log('所有列:', systemColumns.columns.map((col: any) => ({
                fieldName: col.fieldName,
                hasEnumValues: !!(col.enumValues && col.enumValues.length > 0),
                enumValuesCount: col.enumValues ? col.enumValues.length : 0
            })));
            
            // 查找检视人员字段
            const reviewerColumn = systemColumns.columns.find((col: any) => 
                col.fieldName === 'reviewer' || col.fieldName === '检视人员'
            );
            
            if (!reviewerColumn) {
                vscode.window.showWarningMessage('没有找到检视人员字段！');
                console.log('可用的字段名:', systemColumns.columns.map((col: any) => col.fieldName));
                return;
            }
            
            console.log('检视人员字段:', reviewerColumn);
            
            if (!reviewerColumn.enumValues || reviewerColumn.enumValues.length === 0) {
                vscode.window.showWarningMessage('检视人员字段没有 enumValues 数据！');
                return;
            }
            
            console.log('检视人员字段的 enumValues:', reviewerColumn.enumValues);
            
            // 测试用户列表获取
            const userList = commentManager.getUserListFromColumns();
            console.log('获取到的用户列表:', userList);
            
            if (userList.length === 0) {
                vscode.window.showWarningMessage('用户列表为空！');
            } else {
                vscode.window.showInformationMessage(`成功获取到 ${userList.length} 个用户：${userList.map(u => u.label).join(', ')}`);
            }
            
            console.log('=== 字段配置调试结束 ===');
        } catch (error) {
            console.error('字段配置调试失败:', error);
            vscode.window.showErrorMessage(`字段配置调试失败: ${error}`);
        }
    });

    // 添加数据存储测试命令
    const testStorageDisposable = vscode.commands.registerCommand('codeReviewHelper.testStorage', async () => {
        try {
            console.log('=== 数据存储测试开始 ===');
            
            // 获取当前评论数据
            const comments = commentManager.getComments();
            console.log('当前内存中的评论数量:', comments.length);
            console.log('当前内存中的评论数据:', comments);
            
            // 测试保存和重新加载
            console.log('开始测试数据保存和重新加载...');
            await commentManager.reloadComments();
            const reloadedComments = commentManager.getComments();
            console.log('重新加载后的评论数量:', reloadedComments.length);
            console.log('重新加载后的评论数据:', reloadedComments);
            
            // 检查数据一致性
            const isDataConsistent = comments.length === reloadedComments.length && 
                comments.every((comment, index) => {
                    const reloadedComment = reloadedComments[index];
                    return comment.id === reloadedComment.id && 
                           comment.confirmResult === reloadedComment.confirmResult;
                });
            
            console.log('数据一致性检查:', isDataConsistent ? '通过' : '失败');
            
            if (isDataConsistent) {
                vscode.window.showInformationMessage('数据存储测试通过！数据已正确保存到本地存储。');
            } else {
                vscode.window.showErrorMessage('数据存储测试失败！数据可能没有正确保存。');
            }
            
            console.log('=== 数据存储测试结束 ===');
        } catch (error) {
            console.error('数据存储测试失败:', error);
            vscode.window.showErrorMessage(`数据存储测试失败: ${error}`);
        }
    });

    // 添加测试命令
    const testPathDisposable = vscode.commands.registerCommand('codeReviewHelper.testPath', async () => {
        const comments = commentManager.getComments();
        if (comments.length === 0) {
            vscode.window.showWarningMessage('没有评审记录可以测试');
            return;
        }

        const comment = comments[0];
        console.log('=== 路径测试开始 ===');
        console.log('评论对象:', comment);
        console.log('文件路径:', comment.filePath);
        console.log('行号:', comment.startLine);
        console.log('工作区文件夹:', vscode.workspace.workspaceFolders);
        
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceFolder = vscode.workspace.workspaceFolders[0];
            console.log('工作区路径:', workspaceFolder.uri.fsPath);
            
            const path = require('path');
            const fullPath = path.join(workspaceFolder.uri.fsPath, comment.filePath);
            console.log('拼接后的完整路径:', fullPath);
            
            const fs = require('fs');
            console.log('文件是否存在:', fs.existsSync(fullPath));
            
            // 尝试列出工作区目录
            try {
                const files = fs.readdirSync(workspaceFolder.uri.fsPath);
                console.log('工作区根目录文件:', files.slice(0, 10)); // 只显示前10个
            } catch (error) {
                console.error('读取工作区目录失败:', error);
            }
        }
        
        console.log('=== 路径测试结束 ===');
        vscode.window.showInformationMessage('路径测试完成，请查看控制台输出');
    });

    // 注册文件监听器，用于更新行标记
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
    const fileChangeDisposable = fileWatcher.onDidChange(() => {
        commentManager.refreshLineMarkers();
    });

    // 注册编辑器切换监听器
    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(() => {
        commentManager.refreshLineMarkers();
    });

    context.subscriptions.push(
        providerDisposable,
        addCommentDisposable,
        openPanelDisposable,
        settingsDisposable,
        jumpToCommentDisposable,
        exportCommentsDisposable,
        importCommentsDisposable,
        clearCommentsDisposable,
        commitToServerDisposable,
        pullFromServerDisposable,
        deleteCommentDisposable,
        showCommentDetailDisposable,
        showOriginalSnapshotDisposable,
        editConfirmDisposable,
        refreshDisposable,
        openCommentDetailDisposable,
        refreshProjectsDisposable,
        debugColumnConfigDisposable,
        testStorageDisposable,
        testPathDisposable,
        fileChangeDisposable,
        editorChangeDisposable
    );

    // 初始化行标记
    commentManager.refreshLineMarkers();
}

export function deactivate() {
    console.log('Code Review Helper extension is now deactivated!');
}
