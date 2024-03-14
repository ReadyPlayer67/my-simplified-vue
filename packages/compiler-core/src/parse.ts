import { Node, NodeTypes } from './ast'

const enum TagType {
  Start,
  End,
}

export interface ParserContext {
  source: string
}

//得到抽象语法树AST
export function baseParse(content: string) {
  const context = createParserContext(content)
  return createRoot(parseChildren(context, []))
}

function parseChildren(context: ParserContext, ancestors: Node[]) {
  let nodes: Node[] = []
  while (!isEnd(context, ancestors)) {
    let node: Node | undefined = undefined
    const s = context.source
    if (s.startsWith('{{')) {
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      //如果是<开头，认为是一个element标签
      if (/[a-z]/i.test(s[1])) {
        //<后面必须是字母
        node = parseElement(context, ancestors)
      }
    }
    if (!node) {
      node = parseText(context)
    }
    nodes.push(node)
  }
  return nodes
}

function isEnd(context: ParserContext, ancestors: Node[]) {
  const s = context.source
  //当source没有值或者遇到结束标签的时候，应当停止循环
  if (s.startsWith('</')) {
    //这里从后往前循环栈，因为如果标签是闭合的，头部标签一定是在栈顶的，这样循环有利于性能
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const tag = ancestors[i].tag
      if (startsWithEndTagOpen(s, tag!)) {
        return true
      }
    }
  }
  return !s
}

function parseText(context: ParserContext): Node {
  const endTokens = ['</', '{{']
  let endIndex = context.source.length
  for (let endToken of endTokens) {
    const index = context.source.indexOf(endToken)
    //如果读取到闭合标签或插值{{标签都需要停止读取，且要取到最小的索引位置
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }
  const content = parseTextData(context, endIndex)
  return {
    type: NodeTypes.TEXT,
    content,
  }
}

function parseTextData(context: ParserContext, length: number) {
  const content = context.source.slice(0, length)
  advanceBy(context, length)
  return content
}

function parseElement(context: ParserContext, ancestors: Node[]): Node {
  //处理<div>起始标签
  const element = parseTag(context, TagType.Start) as Node
  //使用一个栈ancestors记录已经处理过的头部element标签
  ancestors.push(element)
  //在开始标签和闭合标签中间用parseChildren处理子节点内容
  element.children = parseChildren(context, ancestors)
  //处理完子节点并且里面的标签都是闭合的，无问题，此时就把element从栈中弹出
  ancestors.pop()
  // console.log('--------------', element.tag, context.source)
  //这里要判断下闭合标签名称是否是上面处理的标签名称一致，否则说明标签没有闭合，抛出错误
  if (startsWithEndTagOpen(context.source, element.tag as string)) {
    //处理</div>闭合标签，保证推进
    parseTag(context, TagType.End)
  } else {
    throw new Error(`缺少结束标签${element.tag}`)
  }
  return element
}

//判断context.source下一段内容是不是tag的闭合标签
function startsWithEndTagOpen(source: string, tag: string) {
  return source.startsWith('</') && source.slice(2, tag.length + 2).toLowerCase() === tag.toLowerCase()
}

function parseTag(context: ParserContext, type: TagType): Node | undefined {
  //利用()实现分组捕获，这样在match[1]就能拿到tag内容
  const match: any = /^<\/?([a-z]*)/i.exec(context.source)
  // console.log('match:', match)
  //match[1]就是匹配到的tag类型
  const tag = match[1]
  //match[0]是匹配的全部字符串，也就是<div，往前推进<div和>的字符长度
  advanceBy(context, match[0].length)
  advanceBy(context, 1)
  //用一个标记代表处理的是<div>还是</div>闭合标签，如果是闭合标签就不用返回ast节点
  if (type === TagType.End) return
  return {
    type: NodeTypes.ELEMENT,
    tag,
  }
}

function parseInterpolation(context: ParserContext): Node {
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
  const rawContent = parseTextData(context, rawContentLength)
  const content = rawContent.trim()
  //把已经处理过的内容删掉，继续往前推进处理后面的内容
  advanceBy(context, closeDelimiter.length)
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  }
}

function advanceBy(context: ParserContext, length: number) {
  context.source = context.source.slice(length)
}

function createRoot(children: Node[]): Node {
  return {
    children,
    type: NodeTypes.ROOT,
  }
}

function createParserContext(content: string): ParserContext {
  return {
    source: content,
  }
}
