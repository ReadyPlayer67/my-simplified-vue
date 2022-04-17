import {h} from '../../lib/guide-mini-vue.esm.js'

export const App = {
    //template需要实现单文件组件编译，暂时没实现，先用render函数
    render() {
        return h('div', 'hello ' + this.msg)
    },
    setup() {
        return {
            msg: 'vue'
        }
    }
}
