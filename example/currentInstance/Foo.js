import {h,getCurrentInstance} from "../../lib/guide-mini-vue.esm.js";

export const Foo = {
    name:'Foo',
    setup(){
        console.log(getCurrentInstance())
    },
    render(){
      return h('div',{},'foo')
    }
}