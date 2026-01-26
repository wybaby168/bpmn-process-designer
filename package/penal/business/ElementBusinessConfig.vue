<template>
  <div class="panel-tab__content">
    <!--
      对外契约（供自定义业务面板使用）：

      - values: Record<string, string>
        当前选中元素的业务扩展键值对视图（从 extensionElements 的 BusinessVariables 聚合而来）

      - emit(name, value)
        写回业务扩展键值：
          - key 已存在：只更新对应 `${prefix}:Property` 的 value
          - key 不存在：创建新的 `${prefix}:Property`，并写回 extensionElements（保留其它扩展元素）

      这样调用方只需要关心“键值读写”，无需直接操作 window.bpmnInstances / moddle 细节。
    -->
    <slot name="business" :values="values" :emit="handleChange" :id="id"></slot>
  </div>
</template>
<script>
import { readBusinessVariables, writeBusinessVariable } from "../utils/businessVariables";

export default {
  name: "ElementBusinessConfig",
  props: {
    id: String
  },
  data() {
    return {
      // 具体值
      values: {}
    };
  },
  inject: {
    prefix: "prefix",
  },
  watch: {
    id: {
      immediate: true,
      handler: function(id) {
        // id 变化代表“当前选中元素”变化：重新从 BPMN 模型中读取业务扩展值，刷新 UI
        if (id?.length) {
          this.resetValues();
        }
      }
    }
  },
  computed: {
    tag() {
      return `${this.prefix}:BusinessVariables`;
    }
  },
  methods: {
    resetValues() {
      // bpmnElement 是 bpmn-js 的 element（包含 businessObject 等），从属性面板全局注入读取
      this.bpmnElement = window.bpmnInstances.bpmnElement;

      // 读取 BusinessVariables（同时保留其它扩展元素列表，供写回时使用）
      const state = readBusinessVariables({ bpmnElement: this.bpmnElement, prefix: this.prefix });
      this.elements = state.elements;
      this.otherExtensionList = state.otherExtensionList;
      this.indexes = state.indexes;
      this.values = state.values;
    },
    // 核心，改变值的方法，会触发xml节点更新
    handleChange(name, value) {
      const { modeling, moddle } = window.bpmnInstances;

      // 读一次 state 并传入写方法，避免写方法内部再次扫描 extensionElements
      const state = readBusinessVariables({ bpmnElement: this.bpmnElement, prefix: this.prefix });
      const nextState = writeBusinessVariable({
        bpmnElement: this.bpmnElement,
        prefix: this.prefix,
        name,
        value,
        modeling,
        moddle,
        state
      });

      // 写回后同步本组件缓存，保证 slot 侧 values 实时更新
      this.elements = nextState.elements;
      this.otherExtensionList = nextState.otherExtensionList;
      this.indexes = nextState.indexes;
      this.values = nextState.values;
    }
  },
  beforeDestroy() {
    this.bpmnElement = null;
  }
};
</script>
