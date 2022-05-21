import {baseParse} from "../src/parse";
import {generate} from "../src/codegen";

describe('codegen',function (){
    it('string', function () {
        const ast = baseParse('hi')
        const code = generate(ast)
        //生成一个快照,之后每次测试生成结果和快照进行对比
        expect(code).toMatchSnapshot()
    });
})
