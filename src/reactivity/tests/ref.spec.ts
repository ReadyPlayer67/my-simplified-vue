import {isRef, ref, unRef} from "../ref";
import {effect} from "../effect";
import {reactive} from "../reactive";

describe('ref', function () {
    it('happy path', function () {
        const a = ref<number>(1)
        expect(a.value).toBe(1)
    });

    it('should be reactive', function () {
        const a = ref<number>(1)
        let dummy
        let calls = 0 //用于显示effect被调用了几次
        effect(() => {
            calls++
            dummy = a.value
        })
        expect(calls).toBe(1)
        expect(dummy).toBe(1)
        a.value = 2
        expect(calls).toBe(2)
        expect(dummy).toBe(2)
        //当ref的值相同时不触发trigger
        a.value = 2
        expect(calls).toBe(2)
        expect(dummy).toBe(2)
    });

    it('should make nested properties reactive', function () {
        //实现ref接收一个对象，这个对象内部的熟悉也是响应式的
        const a = ref<any>({
            count: 1
        })
        let dummy
        effect(() => {
            dummy = a.value.count
        })
        expect(dummy).toBe(1)
        a.value.count = 2
        expect(dummy).toBe(2)
    });

    it('isRef', function () {
        const a = ref(1)
        const user = reactive({
            age: 1
        })
        expect(isRef(a)).toBe(true)
        expect(isRef(1)).toBe(false)
        expect(isRef(user)).toBe(false)
    });

    it('unRef', function () {
        const a = ref(1)
        expect(unRef(a)).toBe(1)
        expect(unRef(1)).toBe(1)
    });
});