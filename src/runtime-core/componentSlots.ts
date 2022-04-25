export function initSlots(instance,children){
    normalizeObjectSlots(children,instance.slots)
}

function normalizeObjectSlots(children,slots){
    for (const key in children) {
        const value = children[key]
        //父组件上的具名插槽是Record<string,function>
        slots[key] = (props) => {
            // console.log(value)
            // console.log(props)
            return normalizeSlotValue(value(props))
        }
    }
}

function normalizeSlotValue(value){
    return Array.isArray(value) ? value : [value]
}
