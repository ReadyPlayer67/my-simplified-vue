import {createComponentInstance, setupComponent} from "./component";
import {EMPTY_OBJ} from "../shared";
import {ShapeFlags} from "../shared/ShapeFlags";
import {Fragment, Text} from "./vnode";
import {createAppApi} from "./createApp";
import {effect} from "../reactivity/effect";

export function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        patchProp: hostPatchProp,
        insert: hostInsert,
        remove: hostRemove,
        setElementText: hostSetElementText
    } = options

    function render(vnode, container) {
        //入口parentComponent是null
        patch(null, vnode, container, null, null)
    }

    //n1代表旧的vnode，n2代表新的vnode
    function patch(n1, n2, container, parentComponent, anchor) {
        const {shapeFlag} = n2
        switch (n2.type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor)
                break
            case Text:
                processText(n1, n2, container)
                break
            default:
                //通过位运算符判断vnode的类型
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(n1, n2, container, parentComponent, anchor)
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1, n2, container, parentComponent, anchor)
                }
                break
        }
    }

    //处理Fragment类型节点
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor)
    }

    //处理Text类型节点
    function processText(n1, n2, container) {
        //这里的children就是文本
        const {children} = n2
        const textNode = (n2.el = document.createTextNode(children))
        container.append(textNode)
    }

    //处理element类型的vnode
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {//如果n1不存在，是初始化
            mountElement(n2, container, parentComponent, anchor)
        } else {
            patchElement(n1, n2, container, parentComponent, anchor)
        }
    }

    function patchElement(n1, n2, container, parentComponent, anchor) {
        const oldProps = n1.props || EMPTY_OBJ
        const newProps = n2.props || EMPTY_OBJ
        const el = (n2.el = n1.el)
        patchChildren(n1, n2, el, parentComponent, anchor)
        patchProps(el, oldProps, newProps)
    }

    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlag = n1.shapeFlag
        const c1 = n1.children
        const {shapeFlag} = n2
        const c2 = n2.children
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                //老的是array，新的是text
                unmountChildren(c1)
                hostSetElementText(container, c2)
            } else {
                //老的是text，新的也是text
                if (c1 !== c2) {
                    hostSetElementText(container, c2)
                }
            }
        } else {
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                //老的是text，新的是array
                hostSetElementText(container, '')
                mountChildren(c2, container, parentComponent, anchor)
            } else {
                patchKeyedChildren(c1, c2, container, parentComponent, anchor)
            }
        }
    }

    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        let i = 0
        const l2 = c2.length
        let e1 = c1.length - 1
        let e2 = l2 - 1

        function isSameVNodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key
        }

        //对比左侧
        while (i <= e1 && i <= e2) {
            const n1 = c1[i]
            const n2 = c2[i]
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor)
            } else {
                break
            }
            i++
        }
        //对比右侧
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1]
            const n2 = c2[e2]
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor)
            } else {
                break
            }
            e1--
            e2--
        }
        console.log('i: ' + i)
        console.log('e1: ' + e1)
        console.log('e2: ' + e2)
        //新的比老的长 a b -> d c a b
        if (i > e1) {
            if (i <= e2) {
                //i~e2是新增的节点下标范围，如果是在前面新增节点，e2+1就是insertBefore插入节点的下标
                const nextPos = e2 + 1
                //nextPos<c2.length说明是在前面新增节点，否则是在后面新增节点，insertBefore的第二个参数就是null
                const anchor = nextPos < l2 ? c2[nextPos].el : null
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor)
                    i++
                }
            }
        } else if (i > e2) {//老的比新的长 a b c -> a b
            while (i <= e1) {
                hostRemove(c1[i].el)
                i++
            }
        } else {//中间对比 a b c d f g -> a b e c f g
            const s1 = i
            const s2 = i
            //新节点数组中需要去对比的节点数量
            const toBePatched = e2 - s2 + 1
            //已经对比过的节点数量
            let patched = 0
            //新建一个map存放key和节点在新节点数组中下标的mapping关系{'c':3,'e':2}
            const keyToNewIndexMap = new Map()
            //创建一个数组并指定长度（利于性能），下标是节点在新节点数组的位置，值是在老节点数组中的位置（从1开始数，0代表新增的）
            //a,b,c,d,e,z,f,g -> a,b,d,c,y,e,f,g 就是[4,3,0,5]
            const newIndexToOldIndexMap = new Array(toBePatched)
            for (let i = 0; i < toBePatched; i++) {
                //初始化数组，0代表老节点数组中不存在这个节点
                newIndexToOldIndexMap[i] = 0
            }
            //用一个变量标记节点是否是移动的
            let moved = false
            //记录当前最大的newIndex
            let maxNewIndexSoFar = 0
            //遍历新节点数组，生成map影射
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i]
                keyToNewIndexMap.set(nextChild.key, i)
            }
            //遍历老节点数组，再去新节点数组中查找该节点是否存在
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i]
                //如果已经比对过的数量超过需要对比的数量，说明不需要在比对了，直接删除 ced->ec
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el)
                    continue
                }
                let newIndex //老节点在新节点数组中的位置下标
                //如果用户设置了key属性，可以直接通过key直接查找到新元素的位置
                if (prevChild.key !== null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key)
                } else {
                    //如果用户没有设置key属性，就只能去遍历新节点数组，查找老节点是否存在
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j
                            break
                        }
                    }
                }
                //判断节点是否存在于新节点树中
                if (newIndex === undefined) {
                    //不存在删除
                    hostRemove(c1[i].el)
                } else {
                    //下标是在变动部分（i~e2）的下标，所以newIndex要减去s2
                    //值是在老节点数组的位置，但是不能是0，因为0代表在老节点数组中不存在该节点，所以+1以示区分
                    newIndexToOldIndexMap[newIndex - s2] = i + 1
                    //记录下来当前最大的newIndex，如果大于说明是加在后面的节点，不需要移动
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex
                    } else {
                        moved = true
                    }
                    //存在则继续patch深层次对比新更新老两个元素（props，children...）
                    patch(prevChild, c2[newIndex], container, parentComponent, null)
                    patched++
                }
            }
            console.log(newIndexToOldIndexMap)
            //获取最长递增子序列[5,3,4] -> [1,2]
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []
            // console.log(increasingNewIndexSequence)
            let j = increasingNewIndexSequence.length - 1
            //这里使用反向循环，因为我们insertBefore插入元素需要后一个元素，后一个元素有可能是不稳定的
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = i + s2
                const nextChild = c2[nextIndex]
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null
                //0代表老的节点数组中没有该元素，执行插入
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anchor)
                } else if (moved) {
                    //如果j<0代表最长递增子序列是空，说明顺序全反了
                    //或者当前节点不在稳定递增的序列中，就需要移动
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        console.log('移动位置')
                        hostInsert(nextChild.el, container, anchor)
                    } else {
                        j--
                    }
                }
            }
        }

    }

    function unmountChildren(children) {
        for (let item of children) {
            const el = item.el
            hostRemove(el)
        }
    }

    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            for (const key in newProps) {
                const oldProp = oldProps[key]
                const newProp = newProps[key]
                if (oldProp !== newProp) {
                    hostPatchProp(el, key, oldProp, newProp)
                }
            }
            //oldProps不为空对象才需要进行检查
            //注意：对象是引用类型，所以不能用==={}判断，应当对同一个引用进行判断
            if (oldProps !== EMPTY_OBJ) {
                for (const key in oldProps) {
                    //新props中不存在这个key了
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null)
                    }
                }
            }
        }
    }

    function mountElement(vnode, container, parentComponent, anchor) {
        const {type, props, children, shapeFlag} = vnode
        //使用连续赋值，把el赋值给vnode.el
        //但是这里的vnode是element类型的（div），组件的vnode上是没有值的，所以要在下面赋值给组件的el
        const el = vnode.el = hostCreateElement(type)
        for (const key in props) {
            const val = props[key]
            hostPatchProp(el, key, null, val)
        }
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            //如果children是字符串，就直接显示
            el.textContent = children
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            //如果children是数组，说明是子元素，继续调用patch渲染
            mountChildren(vnode.children, el, parentComponent, anchor)
        }
        //把element append到页面上
        // container.append(el)
        hostInsert(el, container, anchor)
    }

    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach(vnode => {
            patch(null, vnode, container, parentComponent, anchor)
        })
    }

    //处理组件类型的vnode
    function processComponent(n1, n2, container, parentComponent, anchor) {
        //挂载虚拟节点
        mountComponent(n2, container, parentComponent, anchor)
    }

    function mountComponent(initialVnode, container, parentComponent, anchor) {
        //创建一个组件实例
        const instance = createComponentInstance(initialVnode, parentComponent)
        //初始化组件
        setupComponent(instance)
        //执行render方法
        setupRenderEffect(instance, initialVnode, container, anchor)
    }

    function setupRenderEffect(instance, initialVnode, container, anchor) {
        //用effect把render()方法包裹起来，第一次执行render会触发get，把依赖收集起来
        //之后响应式对象变化，会触发依赖，执行effect.fn，重新执行render，从而生成一个新的subTree
        effect(() => {
            //在instance上新增一个属性isMounted用于标记组件是否已经初始化，如果已经初始化，就进入update逻辑
            if (!instance.isMounted) {
                //把proxy对象挂载到render方法上（通过call指定render方法里this的值）
                const {proxy} = instance
                const subTree = (instance.subTree = instance.render.call(proxy))
                //vnode->element->mountElement
                //拿到组件的子组件，再交给patch方法处理
                patch(null, subTree, container, instance, anchor)
                //所有的element都已经mount了，也就是说组件被全部转换为了element组成的虚拟节点树结构
                //这时候subTree的el就是这个组件根节点的el，赋值给组件的el属性即可
                initialVnode.el = subTree.el
                instance.isMounted = true
            } else {
                const {proxy} = instance
                const subTree = instance.render.call(proxy)
                const prevSubTree = instance.subTree
                instance.subTree = subTree
                patch(prevSubTree, subTree, container, instance, anchor)
                initialVnode.el = subTree.el
            }

        })

    }

    return {
        createApp: createAppApi(render)
    }
}

//求最长递增子序列的算法
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                } else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}
