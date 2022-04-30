import {h,ref} from '../../lib/guide-mini-vue.esm.js'

export const App = {
    name:'App',
    setup(){
        const count = ref(0)
        const onClick = () => {
            count.value++
        }
        return {
            count,
            onClick
        }
    },
    //实现更新就是在this.count变化的时候触发依赖，重新生成一个vnode树
    //并和之前的vnode树进行对比，更新变化的部分
    render(){
        return h('div',{
            id:'root'
        },[
            h('div',{},'count' + this.count),
            h('button',{
                onClick:this.onClick
            },'click')
        ])
    }
}
