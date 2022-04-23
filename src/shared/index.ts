export const extend = Object.assign

export const isObject = (val) => {
    return val !== null && typeof val === 'object'
}

export const hasChange = (val,newVal) => {
    return !Object.is(val,newVal)
}

// export const hasOwn = (obj,key) => obj.hasOwnProperty(key) 两种写法一个意思
export const hasOwn = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key)