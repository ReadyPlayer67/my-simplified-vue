import {h,ref,getCurrentInstance,nextTick} from '../../dist/my-simplified-vue.esm.js'

export const App = {
    name:'App',
    setup(){
        const count = ref(1)
        const instance = getCurrentInstance()
        async function onClick() {
            for (let i = 0; i < 100; i++) {
                count.value = i;
            }
            console.log(instance)
            //通过nextTick拿到渲染之后的视图
            await nextTick()
            //await之后的代码fn相当于Promise.then(fn)
            console.log(instance)
        }

        return {
            onClick,
            count,
        }
    },
    render(){
        const button = h("button", { onClick: this.onClick }, "update");
        const p = h("p", {}, "count:" + this.count);

        return h("div", {}, [button, p]);
    }
}
