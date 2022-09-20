import {NodeTypes} from "../ast";
import {isText} from "../utils";

export function transformText(node) {
    if (node.type === NodeTypes.ELEMENT) {
        return () => {
            const {children} = node
            let currentContainer
            for (let i = 0; i < children.length; i++) {
                const child = children[i]
                if (isText(child)) {
                    //检查文字节点的后一个节点
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j]
                        if (isText(next)) {
                            //如果出现了两个相邻的文字节点
                            if (!currentContainer) {
                                //如果currentContainer不存在，代表是child是复合节点的第一项
                                //创建一个复合节点，并把文本节点替换为复合节点，并把文本节点放到children里
                                currentContainer = children[i] = {
                                    type: NodeTypes.COMPOUND_EXPRESSION,
                                    children: [child]
                                }
                            }
                            //往复合节点的children里追加+和下一个文本节点
                            currentContainer.children.push(' + ')
                            currentContainer.children.push(next)
                            //从children中删除next节点，并且把下标前移一位，以防循环提前中止
                            children.splice(j, 1)
                            j--
                        } else {
                            //如果再下一个节点不是文本节点了，就重置currentContainer并跳出内层循环，重新开始寻找新的可能的复合节点
                            currentContainer = undefined
                            break
                        }
                    }
                }
            }
        }
    }
}