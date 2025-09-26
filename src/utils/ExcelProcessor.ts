import * as XLSX from 'xlsx';
import { ReviewComment } from '../models/ReviewComment';

export class ExcelProcessor {
    async exportComments(comments: ReviewComment[], filePath: string): Promise<void> {
        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        
        // 准备数据
        const data = comments.map(comment => ({
            'ID': comment.id,
            '项目信息': comment.projectId || '',
            'Git仓库': comment.gitRepositoryName || '',
            'Git分支': comment.gitBranchName || '',
            '文件路径': comment.filePath,
            '代码行号': comment.lineRange,
            '代码片段': comment.content,
            '意见类型': this.getTypeText(comment.type),
            '检视人员': comment.reviewer,
            '检视时间': comment.reviewDate,
            '检视意见': comment.comment,
            '指定确认人员': comment.assignConfirmer || '',
            '实际确认人员': comment.realConfirmer || '',
            '确认结果': this.getConfirmResultText(comment.confirmResult),
            '确认说明': comment.confirmNotes || '',
            '确认时间': comment.confirmDate || ''
        }));

        // 创建工作表
        const worksheet = XLSX.utils.json_to_sheet(data);
        
        // 设置列宽
        const columnWidths = [
            { wch: 20 }, // ID
            { wch: 15 }, // 项目信息
            { wch: 20 }, // Git仓库
            { wch: 15 }, // Git分支
            { wch: 30 }, // 文件路径
            { wch: 15 }, // 代码行号
            { wch: 50 }, // 代码片段
            { wch: 10 }, // 意见类型
            { wch: 15 }, // 检视人员
            { wch: 20 }, // 检视时间
            { wch: 50 }, // 检视意见
            { wch: 15 }, // 指定确认人员
            { wch: 15 }, // 实际确认人员
            { wch: 10 }, // 确认结果
            { wch: 30 }, // 确认说明
            { wch: 20 }  // 确认时间
        ];
        
        worksheet['!cols'] = columnWidths;
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(workbook, worksheet, '代码评审意见');
        
        // 写入文件
        XLSX.writeFile(workbook, filePath);
    }

    async importComments(filePath: string): Promise<ReviewComment[]> {
        // 读取Excel文件
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 转换为JSON
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        // 转换为ReviewComment对象
        const comments: ReviewComment[] = data.map((row: any) => ({
            id: row['ID'] || '',
            filePath: row['文件路径'] || '',
            lineRange: row['代码行号'] || '',
            startLine: this.parseStartLine(row['代码行号']),
            endLine: this.parseEndLine(row['代码行号']),
            content: row['代码片段'] || '',
            comment: row['检视意见'] || '',
            reviewer: row['检视人员'] || '',
            reviewDate: row['检视时间'] || '',
            type: this.getTypeValue(row['意见类型']),
            assignConfirmer: row['指定确认人员'] || '',
            realConfirmer: row['实际确认人员'] || '',
            confirmResult: this.getConfirmResultValue(row['确认结果']),
            confirmNotes: row['确认说明'] || '',
            confirmDate: row['确认时间'] || '',
            projectId: row['项目信息'] || '',
            gitRepositoryName: row['Git仓库'] || '',
            gitBranchName: row['Git分支'] || ''
        }));

        return comments;
    }

    private getTypeText(type: string): string {
        const typeMap: { [key: string]: string } = {
            '1': '问题',
            '2': '建议',
            '3': '疑问'
        };
        return typeMap[type] || type;
    }

    private getTypeValue(typeText: string): string {
        const typeMap: { [key: string]: string } = {
            '问题': '1',
            '建议': '2',
            '疑问': '3'
        };
        return typeMap[typeText] || '1';
    }

    private getConfirmResultText(result: string): string {
        const resultMap: { [key: string]: string } = {
            'unconfirmed': '未确认',
            '2': '已修改',
            '3': '待修改',
            '4': '拒绝'
        };
        return resultMap[result] || result;
    }

    private getConfirmResultValue(resultText: string): string {
        const resultMap: { [key: string]: string } = {
            '未确认': 'unconfirmed',
            '已修改': '2',
            '待修改': '3',
            '拒绝': '4'
        };
        return resultMap[resultText] || 'unconfirmed';
    }

    private parseStartLine(lineRange: string): number {
        if (!lineRange) return 0;
        const match = lineRange.match(/(\d+)\s*~\s*(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    private parseEndLine(lineRange: string): number {
        if (!lineRange) return 0;
        const match = lineRange.match(/(\d+)\s*~\s*(\d+)/);
        return match ? parseInt(match[2]) : 0;
    }
}
