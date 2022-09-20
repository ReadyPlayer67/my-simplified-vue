export * from './toDisplayString';
export {ShapeFlags} from './ShapeFlags'

export const extend = Object.assign

export const EMPTY_OBJ = {}

export const isObject = (val) => {
    return val !== null && typeof val === 'object'
}

export const isString = (val) => typeof val === 'string'

export const hasChange = (val,newVal) => {
    return !Object.is(val,newVal)
}

// export const hasOwn = (obj,key) => obj.hasOwnProperty(key) 两种写法一个意思
export const hasOwn = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key)

//将add-foo替换为addFoo
const camelize = (str:string) => {
    return str.replace(/-(\w)/g,(_,c:string) => {
        return c ? c.toUpperCase() : ''
    })
}
//将addFoo替换为AddFoo
const capitalize = (str:string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}
export const toHandlerKey = (str:string) => {
    return str ? 'on' + capitalize(camelize(str)) : ''
}

