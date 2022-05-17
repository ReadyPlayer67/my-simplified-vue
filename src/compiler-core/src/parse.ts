import {NodeTypes} from "./ast";

const enum TagType {
    Start,
    End
}

//得到抽象语法树AST
export function baseParse(content: string) {
    const context = createParserContext(content)
    return createRoot(parseChildren(context))
}

function parseChildren(context) {
    let nodes: any = []
    let node
    const s = context.source
    if (s.startsWith('{{')) {
        node = parseInterpolation(context)
    } else if (s[0] === '<') {//如果是<开头，认为是一个element标签
        if (/[a-z]/i.test(s[1])) {//<后面必须是字母
            node = parseElement(context)
        }
    }
    nodes.push(node)
    return nodes
}

function parseElement(context) {
    //处理<div>
    const element = parseTag(context, TagType.Start)
    //处理</div>闭合标签，保证推进
    parseTag(context,TagType.End)
    return element
}

function parseTag(context, type: TagType) {
    //利用()实现分组捕获，这样在match[1]就能拿到tag内容
    const match: any = /^<\/?([a-z]*)/i.exec(context.source)
    console.log('match:', match)
    //match[1]就是匹配到的tag类型
    const tag = match[1]
    //match[0]是匹配的全部字符串，也就是<div，往前推进<div和>的字符长度
    advanceBy(context,match[0].length)
    advanceBy(context,1)
    //用一个标记代表处理的是<div>还是</div>闭合标签，如果是闭合标签就不用返回ast节点
    if(type === TagType.End) return
    return {
        type:NodeTypes.ELEMENT,
        tag
    }
}

function parseInterpolation(context) {
    //定义前后两个分隔符
    const openDelimiter = '{{'
    const closeDelimiter = '}}'
    //查找闭合位置
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length)
    //往前推进两个字符，去除掉'{{'
    advanceBy(context, openDelimiter.length)
    //通过closeIndex减掉'{{'的长度（因为已经推进了2个字符）获得content的长度
    const rawContentLength = closeIndex - openDelimiter.length
    //根据content长度截取context.source获取content
    const rawContent = context.source.slice(0, rawContentLength)
    const content = rawContent.trim()
    //把已经处理过的内容删掉，继续往前推进处理后面的内容
    advanceBy(context, rawContentLength + closeDelimiter.length)
    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content
        }
    }
}

function advanceBy(context, length) {
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