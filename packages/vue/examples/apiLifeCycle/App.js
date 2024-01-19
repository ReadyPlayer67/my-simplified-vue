import {
  h,
  onMounted,
  onUpdated,
  ref,
} from '../../dist/my-simplified-vue.esm.js'

export const App = {
  name: 'App',
  render() {
    return h(
      'div',
      {
        id: 'root',
        onClick: this.onClick,
      },
      [h('div', { class: 'red' }, 'count: ' + this.count)]
    )
  },
  setup() {
    const count = ref(1)
    onMounted(() => {
      console.log('onMounted----')
    })
    onUpdated(() => {
      console.log('onUpdated----')
    })
    const onClick = () => {
      count.value++
    }
    return {
      count,
      onClick,
    }
  },
}
