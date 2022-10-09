<p align="center"><a href="https://vuejs.org" target="_blank" rel="noopener noreferrer"><img width="100" src="https://vuejs.org/images/logo.png" alt="Vue logo"></a></p>

## 用来学习vue3源码的简化版vue

### 实现功能
* reactivity
* runtime-core
* runtime-dom
* compiler-core

### 使用方法
安装依赖
```bash
pnpm install
```
执行测试
```bash
pnpm test
```
打包
```bash
pnpm build
```
打包后会在`vue/dist/`目录下输出esm和cjs两种规范的js代码，可以通过`vue/examples/`下的案例测试运行时代码
