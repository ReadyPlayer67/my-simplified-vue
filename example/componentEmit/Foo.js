import {h} from "../../lib/guide-mini-vue.esm.js";

export const Foo = {
    name:'Foo',
    setup(props,{emit}){
        const emitAdd = () => {
            emit('add',1,3)
            emit('add-foo')
        }
        return {
            emitAdd
        }
    },
    render(){
        const btn = h('button',{
            onClick:this.emitAdd
        },'emit')
        return h('div',{},[btn])
    }
}
