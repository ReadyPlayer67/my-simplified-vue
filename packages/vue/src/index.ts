//mini-vue出口
export * from '@my-simplified-vue/runtime-dom'
import * as runtimeDom from '@my-simplified-vue/runtime-dom'
import {baseCompile} from "@my-simplified-vue/compiler-core"
import {registerRuntimeCompiler} from "@my-simplified-vue/runtime-dom";

function compileToFunction(template){
    const {code} = baseCompile(template)
    //利用Function构造函数创建一个函数，参数名为Vue，函数体为我们通过compiler生成的代码字符串
    //然后我们执行这个方法，Vue参数即runtime-dom里面暴露出的createVNode...这些方法
    //这个方法返回一个function render，即instance.render需要的render函数
    const render = new Function('Vue',code)(runtimeDom)
    return render
    //code为如下所示的字符串
    // const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock } = Vue
    // return function render(_ctx, _cache, $props, $setup, $data, $options) {
    //     return (_openBlock(), _createElementBlock("div", null, "hi," + _toDisplayString(_ctx.message), 1 /* TEXT */))
    // }
}

registerRuntimeCompiler(compileToFunction)
