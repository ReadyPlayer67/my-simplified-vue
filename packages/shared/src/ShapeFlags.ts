export const enum ShapeFlags {
  ELEMENT = 1, //0001
  FUNCTIONAL_COMPONENT = 1 << 1, //0010
  STATEFUL_COMPONENT = 1 << 2, //0100
  TEXT_CHILDREN = 1 << 3, //1000
  ARRAY_CHILDREN = 1 << 4,
  SLOT_CHILDREN = 1 << 5,
  TELEPORT = 1 << 6,
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT,
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,  //表示组件应当被KeepAlive
  COMPONENT_KEPT_ALIVE = 1 << 9,  //表示组件已经被缓存
}
