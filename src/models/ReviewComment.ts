export interface ReviewComment {
    id: string;
    filePath: string;
    lineRange: string;
    startLine: number;
    endLine: number;
    content: string;
    comment: string;
    reviewer: string;
    reviewDate: string;
    type: string;
    assignConfirmer: string;
    realConfirmer: string;
    confirmResult: string;
    confirmNotes: string;
    confirmDate: string;
    projectId?: string;
    gitRepositoryName?: string;
    gitBranchName?: string;
    fileSnapshot?: string;
    dataVersion?: number;
    commitFlag?: number;
    propValues?: Map<string, ValuePair>;
    // 新增字段
    identifier?: string; // ID字段
}

export interface ValuePair {
    value: string;
    showName: string;
}

export interface Column {
    id: number;
    columnCode: string;
    showName: string;
    sortIndex: number;
    supportInExcel: boolean;
    excelColumnWidth: number;
    systemInitialization: boolean;
    showInIdeaTable: boolean;
    webTableColumnWidth: number;
    showInWebTable: boolean;
    showInAddPage: boolean;
    showInEditPage: boolean;
    showInConfirmPage: boolean;
    editableInAddPage: boolean;
    editableInEditPage: boolean;
    editableInConfirmPage: boolean;
    inputType: string;
    dictCollectionCode?: string;
    enumValues?: ValuePair[];
    required: boolean;
}

export interface RecordColumns {
    columns: Column[];
}

export interface GlobalConfigInfo {
    versionType: number;
    language: number;
    closeLineMark: boolean;
    serverAddress: string;
    account: string;
    pwd: string;
    currentUserInfo?: ValuePair;
    selectedServerProjectId?: number;
    cachedProjectList?: ServerProjectShortInfo[];
}

export interface ServerProjectShortInfo {
    projectId: number;
    projectName: string;
}

export interface CommentBody {
    id: string;
    dataVersion?: number;
    values: Map<string, ValuePair> | Record<string, ValuePair>;
}

export interface CommitComment {
    comments: CommentBody[];
}

export interface CommitResult {
    success: boolean;
    errDesc?: string;
    failedIds?: string[];
    versionMap?: Map<string, number>;
}

export interface Response<T> {
    code: number;
    message: string;
    data: T;
}

export interface ReviewQueryParams {
    projectId: number;
    type: string;
}
