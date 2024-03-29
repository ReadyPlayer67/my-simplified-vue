import { baseParse } from './parse'
import { transform } from './transform'
import { transformExpression } from './transforms/transformExpression'
import { transformElement } from './transforms/transformElement'
import { transformText } from './transforms/transformText'
import { generate } from './codegen'
import { Node } from './ast'

//暴露一个出口方法baseCompile
export function baseCompile(template: string) {
  const ast: Node = baseParse(template)
  transform(ast, {
    nodeTransforms: [transformExpression, transformElement, transformText],
  })
  return generate(ast)
}
