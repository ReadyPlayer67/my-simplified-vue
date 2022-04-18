import {h} from '../../lib/guide-mini-vue.esm.js'

export const App = {
    //template需要实现单文件组件编译，暂时没实现，先用render函数
    render() {
        return h(
            'div',
            {id:'root'},
            [
                h('p',{class:'red'},'red'),
                h('p',{class:'blue'},'blue'),
            ]
        )
    },
    setup() {
        return {
            msg: 'vue'
        }
    }
}
