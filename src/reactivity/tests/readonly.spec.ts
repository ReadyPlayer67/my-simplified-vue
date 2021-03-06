import {isProxy, isReadonly, readonly} from "../reactive";

describe('readonly', () => {
    it('happy path', function () {
        const original = {foo: 1,nested:{bar:2}}
        const wrapper = readonly(original)
        expect(wrapper).not.toBe(original)
        expect(wrapper.foo).toBe(1)
        expect(isReadonly(wrapper)).toBe(true)
        expect(isReadonly(wrapper.nested)).toBe(true)
        expect(isReadonly(original)).toBe(false)
        expect(isProxy(wrapper)).toBe(true)
    });

    it('should warn when call set', function () {
        //使用mock测试技术，构造一个假的方法，然后验证他是否被调用
        console.warn = jest.fn()
        const original = {foo: 1}
        const wrapper = readonly(original)
        wrapper.foo = 2
        //验证console.warn方法是否被调用
        expect(console.warn).toBeCalled()
    });
})


