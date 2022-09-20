import {isReadonly, shallowReadonly} from "../src/reactive";
import {vi} from "vitest";

describe('shallowReadonly',() => {
    //实现一个shallowReadonly的功能，用shallowReadonly创建的对象只有表层是readonly的，下面的属性对象并不是readonly
    it('should not make non-reactive properties reactive', function () {
        const props = shallowReadonly({n:{foo:1}})
        expect(isReadonly(props)).toBe(true)
        expect(isReadonly(props.n)).toBe(false)
    });

    it('should warn when call set', function () {
        //使用mock测试技术，构造一个假的方法，然后验证他是否被调用
        console.warn = vi.fn()
        const original = {foo: 1}
        const wrapper = shallowReadonly(original)
        wrapper.foo = 2
        //验证console.warn方法是否被调用
        expect(console.warn).toBeCalled()
    });
})
