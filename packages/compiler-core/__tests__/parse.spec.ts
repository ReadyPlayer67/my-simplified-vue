import { baseParse } from '../src/parse'
import { NodeTypes } from '../src/ast'
import { describe, test, expect, it } from 'vitest'

describe('Parse', function () {
  //测试插值转换AST语法树功能
  describe('interpolation', function () {
    test('simple interpolation', () => {
      const ast = baseParse('{{ message }}')
      //ast是root节点
      expect(ast.children![0]).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'message',
        },
      })
    })
  })

  describe('element', function () {
    it('simple element', function () {
      const ast = baseParse('<div></div>')
      expect(ast.children![0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        isSelfClosing: false,
        props: [],
        children: [],
      })
    })
  })

  describe('text', function () {
    it('simple text', function () {
      const ast = baseParse('some text')
      expect(ast.children![0]).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'some text',
      })
    })
  })

  test('hello world', function () {
    const ast = baseParse('<div>hi,{{message}}</div>')
    expect(ast.children![0]).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: 'div',
      isSelfClosing: false,
      props: [],
      children: [
        {
          type: NodeTypes.TEXT,
          content: 'hi,',
        },
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'message',
          },
        },
      ],
    })
  })

  test('Nested element', function () {
    const ast = baseParse('<div><p>hi</p>{{message}}</div>')
    expect(ast.children![0]).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: 'div',
      isSelfClosing: false,
      props: [],
      children: [
        {
          type: NodeTypes.ELEMENT,
          tag: 'p',
          isSelfClosing: false,
          props: [],
          children: [
            {
              type: NodeTypes.TEXT,
              content: 'hi',
            },
          ],
        },
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'message',
          },
        },
      ],
    })
  })

  test('should throw error when lack end tag', function () {
    expect(() => {
      baseParse('<div><span></div>')
    }).toThrow('缺少结束标签span')
  })

  test('self closing', function () {
    const ast = baseParse('<div/>after')
    const element = ast.children![0]
    expect(element).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: 'div',
      isSelfClosing: true,
      props: [],
    })
  })

  test('attribute', function () {
    const ast = baseParse('<div id="abc"></div>')
    const element = ast.children![0]
    expect(element).toStrictEqual({
      type: NodeTypes.ELEMENT,
      tag: 'div',
      props: [
        {
          type: NodeTypes.ATTRIBUTE,
          name: 'id',
          value: 'abc',
        },
      ],
      children: [],
      isSelfClosing: false,
    })
  })

  test('simple comment', () => {
    const ast = baseParse('<!--abc-->')
    const comment = ast.children![0]

    expect(comment).toStrictEqual({
      type: NodeTypes.COMMENT,
      content: 'abc',
    })
  })
})
