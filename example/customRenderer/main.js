import {App} from "./App.js";
import {createRenderer} from "../../lib/guide-mini-vue.cjs";
console.log(PIXI)

const game = new PIXI.Application({
    width:500,
    height:500
})
document.body.append(game.view)
const renderer = createRenderer({
    createElement(type){

    },
    pathProp(el,key,val){

    },
    insert(el,parent){

    }
})
// const rootContainer = document.querySelector('#app')
// createApp(App).mount(rootContainer)
