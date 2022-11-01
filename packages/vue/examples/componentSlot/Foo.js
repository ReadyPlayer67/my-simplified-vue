import {h} from "../../dist/my-simplified-vue.esm.js";
import {renderSlots} from "../../dist/my-simplified-vue.esm.js";

export const Foo = {
    name:'Foo',
    setup(){
        return {}
    },
    render(){
        //作用域插槽
        const age = 18
        const foo = h('p',{},'foo')
        //通过renderSlots第三个参数将age传出去
        return h('div',{},[
            renderSlots(this.$slots,'header',{age}),
            foo,
            renderSlots(this.$slots,'footer')
        ])
    }
}
