"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPluginVersion = exports.PLUGIN_VERSION = void 0;
/**
 * 插件版本号常量
 * 统一管理插件版本号，确保与服务器请求版本号一致
 */
exports.PLUGIN_VERSION = '4.2.2';
/**
 * 获取插件版本号
 * @returns 插件版本号字符串
 */
function getPluginVersion() {
    return exports.PLUGIN_VERSION;
}
exports.getPluginVersion = getPluginVersion;
//# sourceMappingURL=Version.js.map