import MyProcessDesigner from "./designer";
import MyProcessPalette from "./palette";
import MyProcessPenal from "./penal";

// 自定义元素选中时的弹出菜单（修改 默认任务 为 用户任务）
import CustomContentPadProvider from "../package/designer/plugins/content-pad";
// 自定义左侧菜单（修改 默认任务 为 用户任务）
import CustomPaletteProvider from "../package/designer/plugins/palette";
import Log from "../package/Log";

const components = [MyProcessDesigner, MyProcessPenal, MyProcessPalette];

const install = function(Vue) {
  components.forEach(component => {
    Vue.component(component.name, component);
  });
};

if (typeof window !== "undefined" && window.Vue) {
  install(window.Vue);
}

export default {
  version: "0.0.1",
  install,
  ...components
};

export { CustomContentPadProvider, CustomPaletteProvider, Log };
