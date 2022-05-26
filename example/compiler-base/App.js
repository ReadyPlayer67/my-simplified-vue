import {ref} from "../../lib/guide-mini-vue.esm.js";

export const App = {
    name:'App',
    template:`<div>hi, {{count}}</div>`,
    setup(){
        //count.value++观察update
        const count = window.count = ref(1)
        return {
            count
        }
    }
}