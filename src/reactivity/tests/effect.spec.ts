//effect单元测试
import {reactive} from "../reactive";
import {effect} from "../effect";

describe('effect',() => {
    it('happy path',() => {
        const user = reactive({
            age:10
        })
        //初始化
        let nextAge;
        effect(() => {
            nextAge = user.age + 1
        })
        expect(nextAge).toBe(11)
        //update
        user.age = 20
        expect(nextAge).toBe(21)
    })

    it('should return runner when call effect', function () {
        let foo = 10
        const runner = effect(() => {
            foo++
            return 'foo'
        })
        expect(foo).toBe(11)
        const r = runner()
        expect(r).toBe('foo')
        expect(foo).toBe(12)
    });
})