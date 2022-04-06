//如果不配置babel，使用import语法会报错，因为jest是运行在node环境中，node默认的模块规范是commonJS规范，不是ESM规范
//告知babel以当前node版本作为转换目标
//同时要安装@babel/preset-typescript以保证jest支持typescript
module.exports = {
    presets: [
        ['@babel/preset-env', {targets: {node: 'current'}}],
        '@babel/preset-typescript',
    ],
}