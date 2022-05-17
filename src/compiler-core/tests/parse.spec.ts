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

    describe('element', function () {
        it('simple element', function () {
            const ast = baseParse('<div></div>')
            expect(ast.children[0]).toStrictEqual({
                type:NodeTypes.ELEMENT,
                tag:'div',
                children:[]
            })
        });
    });

    describe('text', function () {
        it('simple text', function () {
            const ast = baseParse('some text')
            expect(ast.children[0]).toStrictEqual({
                type:NodeTypes.TEXT,
                content:'some text'
            })
        });
    });

    test('hello world',function (){
        const ast = baseParse('<div>hi,{{message}}</div>')
        expect(ast.children[0]).toStrictEqual({
            type:NodeTypes.ELEMENT,
            tag:'div',
            children:[
                {
                    type:NodeTypes.TEXT,
                    content:'hi,'
                },
                {
                    type:NodeTypes.INTERPOLATION,
                    content:{
                        type:NodeTypes.SIMPLE_EXPRESSION,
                        content:'message'
                    }
                }
            ]
        })
    })
});

