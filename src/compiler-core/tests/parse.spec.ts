import {baseParse} from "../src/parse";
import {NodeTypes} from "../src/ast";

describe('Parse', function () {
    //测试插值转换AST语法树功能
    describe('interpolation', function () {
        test('simple interpolation',() => {
            const ast = baseParse('{{ message }}')
            //ast是root节点
            expect(ast.children[0]).toStrictEqual({
                type:NodeTypes.INTERPOLATION,
                content:{
                    type:NodeTypes.SIMPLE_EXPRESSION,
                    content:'message'
                }
            })
        })
    });
});