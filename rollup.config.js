import pkg from './package.json'
import typescript from '@rollup/plugin-typescript'
//rollup支持esm语法
export default {
    input:'./src/index.ts',
    output:[
        //1.cjs -> commonjs
        //2.esm
        {
            format:'cjs',
            file:pkg.main
        },
        {
            format:'es',
            file:pkg.module
        }
    ],
    plugins:[
        //配置插件转换ts语法
        typescript()
    ]
}