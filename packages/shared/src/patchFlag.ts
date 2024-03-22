export const enum PatchFlags {
  //style有变化
  STYLE = 1 << 2,
  //props有变化
  PROPS = 1 << 3,
  FULL_PROPS = 1 << 4,
}
