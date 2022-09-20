import { h } from "../../dist/my-simplified-vue.esm.js";
export default {
    name: "Child",
    setup(props, { emit }) {},
    render(proxy) {
        return h(
            "div",
            {},
            [h("div", {}, "child - props - msg: " + this.$props.msg)]
        );
    },
};
