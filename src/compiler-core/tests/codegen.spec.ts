import {baseParse} from "../src/parse";
import {generate} from "../src/codegen";
import {transform} from "../src/transform";
import {transformExpression} from "../src/transforms/transformExpression";
import {transformElement} from "../src/transforms/transformElement";
import {transformText} from "../src/transforms/transformText";

describe('codegen', function () {
    it('string', function () {
        const ast = baseParse('hi')
        transform(ast)
        const code = generate(ast)
        //生成一个快照,之后每次测试生成结果和快照进行对比
        expect(code).toMatchSnapshot()
    });

    it('interpolation', function () {
        const ast = baseParse('{{message}}')
        transform(ast,{
            nodeTransforms:[transformExpression]
        })
        const code = generate(ast)
        expect(code).toMatchSnapshot()
    });

    it('element', function () {
        const ast:any = baseParse('<div>hi,{{message}}</div>')
        transform(ast,{
            nodeTransforms:[transformText,transformElement]
        })
        console.log('ast-----',ast.codegenNode.children)
        const code = generate(ast)
        expect(code).toMatchSnapshot()
    });
})
