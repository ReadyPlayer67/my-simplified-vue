import {reactive} from "../src/reactive";
import {computed} from "../src/computed";
import {vi} from 'vitest'

describe('computed',function (){
    it('happy path', function () {
        const user = reactive({
            age:1
        })
        const age = computed(() => {
            return user.age
        })
        expect(age.value).toBe(1)
    });

    it('should compute lazily', function () {
        const value = reactive({
            foo:1
        })
        //因为之后要验证getter执行了几次，所以用jest.fn创建这个方法
        const getter = vi.fn(() => {
            return value.foo
        })
        //创建一个computed cValue
        const cValue = computed(getter)
        //验证懒执行，不获取cValue.value，getter方法就不会执行
        expect(getter).not.toHaveBeenCalled()
        //第一次获取cValue.value的时候getter执行一次
        expect(cValue.value).toBe(1)
        expect(getter).toHaveBeenCalledTimes(1)
        //之后获取cValue.value，computed应当被缓存，getter不会被执行
        cValue.value
        expect(getter).toHaveBeenCalledTimes(1)
        //依赖发生变化，缓存失效，getter应当再次执行
        value.foo = 2
        expect(cValue.value).toBe(2)
        expect(getter).toHaveBeenCalledTimes(2)
        cValue.value
        expect(getter).toHaveBeenCalledTimes(2)
    });
})
