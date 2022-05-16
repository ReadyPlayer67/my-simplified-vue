import {NodeTypes} from "./ast";

//得到抽象语法树AST
export function baseParse(content: string) {
    const context = createParserContext(content)
    return createRoot(parseChildren(context))
}

function parseChildren(context) {
    let nodes: any = []
    let node
    if(context.source.startsWith('{{')){
        node = parseInterpolation(context)
    }
    nodes.push(node)
    return nodes
}

function parseInterpolation(context) {
    //定义前后两个分隔符
    const openDelimiter = '{{'
    const closeDelimiter = '}}'
    //查找闭合位置
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length)
    //往前推进两个字符，去除掉'{{'
    advanceBy(context,openDelimiter.length)
    //通过closeIndex减掉'{{'的长度（因为已经推进了2个字符）获得content的长度
    const rawContentLength = closeIndex - openDelimiter.length
    //根据content长度截取context.source获取content
    const rawContent = context.source.slice(0, rawContentLength)
    const content = rawContent.trim()
    //把已经处理过的内容删掉，继续往前推进处理后面的内容
    advanceBy(context,rawContentLength + closeDelimiter.length)
    console.log('content',content)
    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content
        }
    }
}

function advanceBy(context,length){
    context.source = context.source.slice(length)
}

function createRoot(children) {
    return {
        children
    }
}

function createParserContext(content: string) {
    return {
        source: content
    }
}