import {h} from "../../lib/guide-mini-vue.esm.js";

export const Foo = {
    name:'Foo',
    setup(props){
        //props是shallowReadonly的
        props.count++
    },
    render(){
      return h('div',{},"foo:"+this.count)
    }
}