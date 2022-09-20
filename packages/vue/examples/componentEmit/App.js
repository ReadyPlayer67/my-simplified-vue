import {h} from '../../dist/my-simplified-vue.esm.js'
import {Foo} from "./Foo.js";

export const App = {
    name:'App',
    render() {
        return h(
            'div',
            {},
            [
                h(Foo,{
                    onAdd(a,b){
                        console.log('onAdd',a,b)
                    },
                    onAddFoo(){
                        console.log('onAddFoo')
                    }
                })
            ]
        )
    },
    setup() {
        return {}
    }
}
