import {h,createTextVNode} from '../../lib/guide-mini-vue.esm.js'
import {Foo} from "./Foo.js";

export const App = {
    name: 'App',
    render() {
        return h(
            'div',
            {},
            [
                h(Foo, {}, {
                    header: ({age}) => h('p', {}, [h('p',{},'header' + age),createTextVNode('text')]),
                    footer: () => h('p', {}, '456')
                })
            ]
        )
    },
    setup() {
        return {}
    }
}
