import {h} from '../../lib/guide-mini-vue.esm.js'
import {Foo} from "./Foo.js";

window.self = null
export const App = {
    name:'App',
    //template需要实现单文件组件编译，暂时没实现，先用render函数
    render() {
        //因为现在没实现绑定实现，所以把this赋值为window.self来查看this上的属性
        window.self = this
        return h(
            'div',
            {
                id: 'root',
                onClick() {
                    console.log('click')
                },
                onMousedown(){
                    console.log('mousedown')
                }
            },
            [
                h('p', {class: 'red'}, this.msg),
                h(Foo,{
                    count:1
                })
                // h('p', {class: 'blue'}, 'blue'),
            ]
        )
    },
    setup() {
        return {
            msg: 'red1'
        }
    }
}
