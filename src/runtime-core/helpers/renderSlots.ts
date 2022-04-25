import {createVNode} from "../vnode";

//props是子组件往外传递的变量对象
export function renderSlots(slots,name,props){
    //slot此时是一个function
    const slot = slots[name]
    console.log(slot)
    if(typeof slot === 'function'){
        //这里的slot
        return createVNode('div',{},slot(props))
    }
}