#!/usr/bin/env node

/**
 * 版本号同步脚本
 * 从 src/consts/Version.ts 读取版本号，同步到 package.json
 */

const fs = require('fs');
const path = require('path');

// 读取 Version.ts 文件
const versionFilePath = path.join(__dirname, '../src/consts/Version.ts');
const packageJsonPath = path.join(__dirname, '../package.json');

try {
    // 读取 Version.ts 文件内容
    const versionFileContent = fs.readFileSync(versionFilePath, 'utf8');
    
    // 使用正则表达式提取版本号
    const versionMatch = versionFileContent.match(/export const PLUGIN_VERSION = ['"]([^'"]+)['"]/);
    
    if (!versionMatch) {
        console.error('❌ 无法从 Version.ts 文件中提取版本号');
        process.exit(1);
    }
    
    const newVersion = versionMatch[1];
    console.log(`📦 从 Version.ts 读取到版本号: ${newVersion}`);
    
    // 读取 package.json
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    
    // 检查版本号是否已经是最新的
    if (packageJson.version === newVersion) {
        console.log(`✅ package.json 版本号已经是最新的: ${newVersion}`);
        return;
    }
    
    // 更新版本号
    const oldVersion = packageJson.version;
    packageJson.version = newVersion;
    
    // 写回 package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    console.log(`🔄 版本号已更新: ${oldVersion} → ${newVersion}`);
    console.log(`✅ package.json 已同步到版本: ${newVersion}`);
    
} catch (error) {
    console.error('❌ 同步版本号时出错:', error.message);
    process.exit(1);
}
