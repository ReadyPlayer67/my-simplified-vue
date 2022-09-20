import {defineConfig} from 'vitest/config'
import path from "path";

export default defineConfig({
  //将vitest相关api设置为全局的，这样就不用在每个文件里import了
  test: {
    globals: true
  },
  //配置路径别名，因为vitest不认识monorepo配置的@my-simplified-vue/shared格式的导入
  resolve: {
    alias: [
      {
        find: /@my-simplified-vue\/(\w*)/,
        replacement: path.resolve(__dirname, 'packages') + '/$1/src'
      }
    ]
  }
})
