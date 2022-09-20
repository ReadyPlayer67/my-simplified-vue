export const initProps = (instance,raw) => {
    //因为组件有可能没有props，比如main.js中创建App，如果没有需要给一个空对象，不然用undefined创建shallowReadonly会报错
    instance.props = raw || {}
}