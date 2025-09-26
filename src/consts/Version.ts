/**
 * 插件版本号常量
 * 统一管理插件版本号，确保与服务器请求版本号一致
 */
export const PLUGIN_VERSION = '4.2.2';

/**
 * 获取插件版本号
 * @returns 插件版本号字符串
 */
export function getPluginVersion(): string {
    return PLUGIN_VERSION;
}
