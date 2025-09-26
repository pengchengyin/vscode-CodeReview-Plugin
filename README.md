# VSCode Code Review Helper

针对vscode,一个简单易用的代码检视问题记录工具，支持团队协同。

感谢https://github.com/veezean提供该工具，本插件是基于idea插件来复刻的。

## 功能特性

- **快速添加评审意见**：使用 `Alt+A` 快捷键快速添加代码评审意见
- **可视化标记**：在代码行号旁边显示评审标记，方便快速定位
- **跳转功能**：双击评审意见可快速跳转到对应代码位置
- **Excel导入导出**：支持将评审意见导出为Excel表格，或从Excel导入评审意见
- **团队协作**：支持网络模式，可与服务端同步数据，实现团队协作
- **多语言支持**：支持中文和英文界面

## 安装方法

### 方法一：从VSIX文件安装

1. 下载扩展的 `.vsix` 文件
2. 在VSCode中按 `Ctrl+Shift+P` 打开命令面板
3. 输入 `Extensions: Install from VSIX...`
4. 选择下载的 `.vsix` 文件进行安装

### 方法二：从源码编译安装

1. 克隆或下载源码
https://github.com/pengchengyin/vscode-CodeReview-Plugin.git
2. 在项目根目录运行：
   ```bash
   npm install
   npm run compile
   ```
3. 按 `F5` 启动调试模式，或使用 `vsce package` 打包为 `.vsix` 文件

## 使用方法

### 基本使用

1. **添加评审意见**：
   - 选择要评审的代码
   - 按 `Alt+A` 或右键选择"添加评审意见"
   - 填写评审意见内容

2. **查看评审意见**：
   - 在侧边栏的"代码评审"面板中查看所有评审意见
   - 双击评审意见可跳转到对应代码位置

3. **管理评审意见**：
   - 在评审面板中可以删除、编辑评审意见
   - 支持批量操作

### 网络模式（团队协作）

1. **配置服务端**：
   - 打开设置（`Ctrl+,`）
   - 搜索 "Code Review Helper"
   - 配置服务器地址、账号密码

2. **同步数据**：
   - 提交本地评审意见到服务端
   - 从服务端拉取其他成员的评审意见

### Excel导入导出

1. **导出评审意见**：
   - 在评审面板中点击导出按钮
   - 选择保存位置和文件名

2. **导入评审意见**：
   - 在评审面板中点击导入按钮
   - 选择Excel文件进行导入

## 配置说明

### 基本配置

- `codeReviewHelper.serverAddress`: 服务端地址（比如：http://192.168.0.100:23560/）
- `codeReviewHelper.account`: 登录账号
- `codeReviewHelper.password`: 登录密码
- `codeReviewHelper.networkMode`: 是否启用网络模式（默认：true）
- `codeReviewHelper.language`: 界面语言（zh/en，默认：zh）

### 快捷键

- `Alt+A`: 添加评审意见
- `Ctrl+Shift+P` 然后输入 "Code Review": 打开评审面板

## 开发说明

### 项目结构

```
src/
├── extension.ts          # 扩展入口文件
├── commands/             # 命令实现
│   ├── AddCommentCommand.ts
│   └── SettingsCommand.ts
├── managers/             # 管理器
│   ├── ConfigManager.ts
│   ├── NetworkManager.ts
│   └── ReviewCommentManager.ts
├── models/               # 数据模型
│   └── ReviewComment.ts
├── providers/            # 数据提供者
│   └── CodeReviewProvider.ts
└── utils/                # 工具类
    └── ExcelProcessor.ts
```

### 开发环境设置

1. 安装依赖：
   ```bash
   npm install
   ```

2. 编译TypeScript：
   ```bash
   npm run compile
   ```

3. 启动调试：
   - 按 `F5` 启动新的VSCode窗口进行调试
   - 或使用 `Ctrl+Shift+P` -> "Developer: Reload Window" 重新加载

### 打包发布

1. 安装vsce：
   ```bash
   npm install -g vsce
   ```

2. 打包扩展：
   ```bash
   vsce package
   ```

## 服务端配置

本扩展支持与Code Review服务端进行协作。

### 服务端功能

- 用户认证和权限管理
- 项目管理和配置
- 评审意见的存储和同步
- 团队协作功能

## 故障排除

### 常见问题

1. **无法添加评审意见**：
   - 确保已选择代码
   - 检查文件是否在项目根目录下

2. **网络模式连接失败**：
   - 检查服务器地址是否正确
   - 确认网络连接正常
   - 验证账号密码是否正确

3. **Excel导入导出失败**：
   - 确保Excel文件格式正确
   - 检查文件权限

### 日志查看

扩展的日志信息会输出到VSCode的开发者控制台。要查看日志：

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "Developer: Toggle Developer Tools"
3. 在控制台中查看日志信息

## 贡献

欢迎提交Issue和Pull Request来改进这个扩展。

## 许可证

MIT License
