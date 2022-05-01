import {createComponentInstance, setupComponent} from "./component";
import {isObject} from "../shared";
import {ShapeFlags} from "../shared/ShapeFlags";
import {Fragment, Text} from "./vnode";
import {createAppApi} from "./createApp";
import {effect} from "../reactivity/effect";

export function createRenderer(options) {
    const {
        patchProp,
        insert,
        createElement
    } = options
    function render(vnode, container) {
        //入口parentComponent是null
        patch(null,vnode, container, null)
    }
    //n1代表旧的vnode，n2代表新的vnode
    function patch(n1,n2, container, parentComponent) {
        const {shapeFlag} = n2
        switch (n2.type) {
            case Fragment:
                processFragment(n1,n2, container, parentComponent)
                break
            case Text:
                processText(n1,n2, container)
                break
            default:
                //通过位运算符判断vnode的类型
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(n1,n2, container, parentComponent)
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1,n2, container, parentComponent)
                }
                break
        }
    }
    //处理Fragment类型节点
    function processFragment(n1,n2, container, parentComponent) {
        mountChildren(n2, container, parentComponent)
    }
    //处理Text类型节点
    function processText(n1,n2, container) {
        //这里的children就是文本
        const {children} = n2
        const textNode = (n2.el = document.createTextNode(children))
        container.append(textNode)
    }
    //处理element类型的vnode
    function processElement(n1,n2, container, parentComponent) {
        if(!n1){//如果n1不存在，是初始化
            mountElement(n2, container, parentComponent)
        }else{
            patchElement(n1,n2,container)
        }
    }
    function patchElement(n1,n2,container){
        console.log('n1',n1)
        console.log('n2',n2)
    }
    function mountElement(vnode, container, parentComponent) {
        const {type, props, children, shapeFlag} = vnode
        //使用连续赋值，把el赋值给vnode.el
        //但是这里的vnode是element类型的（div），组件的vnode上是没有值的，所以要在下面赋值给组件的el
        const el = vnode.el = createElement(type)
        for (const key in props) {
            const val = props[key]
            patchProp(el,key,val)
        }
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            //如果children是字符串，就直接显示
            el.textContent = children
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            //如果children是数组，说明是子元素，继续调用patch渲染
            mountChildren(vnode, el, parentComponent)
        }
        //把element append到页面上
        // container.append(el)
        insert(el,container)
    }
    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach(vnode => {
            patch(null,vnode, container, parentComponent)
        })
    }
    //处理组件类型的vnode
    function processComponent(n1,n2, container, parentComponent) {
        //挂载虚拟节点
        mountComponent(n2, container, parentComponent)
    }
    function mountComponent(initialVnode, container, parentComponent) {
        //创建一个组件实例
        const instance = createComponentInstance(initialVnode, parentComponent)
        //初始化组件
        setupComponent(instance)
        //执行render方法
        setupRenderEffect(instance,initialVnode, container)
    }
    function setupRenderEffect(instance,initialVnode, container) {
        //用effect把render()方法包裹起来，第一次执行render会触发get，把依赖收集起来
        //之后响应式对象变化，会触发依赖，执行effect.fn，重新执行render，从而生成一个新的subTree
        effect(() => {
            //在instance上新增一个属性isMounted用于标记组件是否已经初始化，如果已经初始化，就进入update逻辑
            if(!instance.isMounted){
                //把proxy对象挂载到render方法上（通过call指定render方法里this的值）
                const {proxy} = instance
                const subTree = (instance.subTree = instance.render.call(proxy))
                //vnode->element->mountElement
                //拿到组件的子组件，再交给patch方法处理
                patch(null,subTree, container, instance)
                //所有的element都已经mount了，也就是说组件被全部转换为了element组成的虚拟节点树结构
                //这时候subTree的el就是这个组件根节点的el，赋值给组件的el属性即可
                initialVnode.el = subTree.el
                instance.isMounted = true
            }else{
                const {proxy} = instance
                const subTree = instance.render.call(proxy)
                const prevSubTree = instance.subTree
                instance.subTree = subTree
                patch(prevSubTree,subTree, container, instance)
                initialVnode.el = subTree.el
            }

        })

    }
    return {
        createApp:createAppApi(render)
    }
}
