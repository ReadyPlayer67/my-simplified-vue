import typescript from '@rollup/plugin-typescript'
//rollup支持esm语法
export default {
    input:'./packages/vue/src/index.ts',
    output:[
        //1.cjs -> commonjs
        //2.esm
        {
            format:'cjs',
            file:'packages/vue/dist/my-simplified-vue.cjs.js'
        },
        {
            format:'es',
            file:'packages/vue/dist/my-simplified-vue.esm.js'
        }
    ],
    plugins:[
        //配置插件转换ts语法
        typescript()
    ]
}
