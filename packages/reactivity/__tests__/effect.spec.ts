//effect单元测试
import {reactive} from "../src/reactive";
import {effect,stop} from "../src/effect";
import {run} from "jest";

describe('effect', () => {
    it('happy path', () => {
        const user = reactive({
            age: 10
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

    it('scheduler', function () {
        //1.通过effect的第二个参数给定一个scheduler的方法
        //2.effect第一次执行的时候，还会执行fn
        //3.当响应式对象set update的时候不会执行fn而是执行scheduler
        //4.如果说当执行runner的时候，会再次执行fn
        let dummy
        let run: any
        const scheduler = jest.fn(() => {
            run = runner
        })
        const obj = reactive({foo:1})
        const runner = effect(() => {
            dummy = obj.foo
        },{ scheduler })
        //scheduler一开始不会被调用
        expect(scheduler).not.toHaveBeenCalled()
        expect(dummy).toBe(1)
        obj.foo++
        //响应式对象变化的时候scheduler方法被调用了一次，而effect的第一个参数方法不会调用
        expect(scheduler).toHaveBeenCalledTimes(1)
        expect(dummy).toBe(1)
        //执行run方法，即effect的第一个参数方法，依赖响应式对象的值才变化
        run()
        expect(dummy).toBe(2)
    });

    it('stop', function () {
        //实现一个stop方法，接收effect返回的runner作为参数，当执行stop方法后，停止响应式更新
        //当执行runner方法以后，重新启动响应式更新
        let dummy
        const obj = reactive({prop:1})
        const runner = effect(() => {
            dummy = obj.prop
        })
        // obj.prop = 2
        obj.prop++
        expect(dummy).toBe(2)
        stop(runner)
        // obj.prop = 3
        //这里如果使用++，stop会失效，因为++相当于obj.prop = obj.prop + 1，会重新触发一次get操作和track，响应式就又生效了
        obj.prop++
        expect(dummy).toBe(2)
        runner()
        expect(dummy).toBe(3)
    });

    it('onStop', function () {
        //实现一个onStop方法，和scheduler一样作为effect的第二个参数选项，每当stop时就执行一次onStop方法
        const obj = reactive({
            foo:1
        })
        const onStop = jest.fn()
        let dummy
        const runner = effect(() => {
            dummy = obj.foo
        },{onStop})
        stop(runner)
        expect(onStop).toBeCalledTimes(1)
    });
})
