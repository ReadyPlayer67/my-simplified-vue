import {h,getCurrentInstance} from "../../dist/my-simplified-vue.esm.js";

export const Foo = {
    name:'Foo',
    setup(){
        console.log(getCurrentInstance())
    },
    render(){
      return h('div',{},'foo')
    }
}
