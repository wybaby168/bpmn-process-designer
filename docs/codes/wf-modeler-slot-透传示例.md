# wf-modeler：透传 form slot 示例（可直接复制）

本页用于说明：当你在封装组件（例如 `wf-modeler`）里使用 `<my-properties-panel>` 时，如何把上层的 `form` slot 透传进去，同时不影响 `<my-properties-panel>` 的默认表单面板（`<element-form />`）渲染。

## 1. 关键点

- 不能无条件声明 `v-slot:form`
  - 原因：`<my-properties-panel>` 内部用 `$scopedSlots.form || $slots.form` 判断是否“传入了 form slot”
  - 如果封装组件无条件声明了 `v-slot:form`，即使上层没传任何内容，也会导致默认 `<element-form />` 被隐藏
- 正确做法：仅在封装组件自身收到了 `form` slot 时才透传给 `<my-properties-panel>`

## 2. 推荐模板（Vue2）

把下面模板放到你的封装组件中（示例文件路径：`packages/WorkflowModeler/Modeler.vue`）：

```vue
<my-properties-panel ...>
  <template v-if="$scopedSlots.form" v-slot:form="data">
    <slot name="form" v-bind="data" />
  </template>
</my-properties-panel>
```

如果你也透传了 `business`，同理建议加判断，避免出现空白 tab：

```vue
<my-properties-panel ...>
  <template v-if="$scopedSlots.business" v-slot:business="data">
    <slot name="business" v-bind="data" />
  </template>
</my-properties-panel>
```

## 3. 可直接套用的完整片段（同时透传 business + form）

```vue
<my-properties-panel
  :width="383"
  :provider="provider"
  :key="`penal-${reloadIndex}`"
  :bpmn-modeler="modeler"
  :prefix="controlForm.prefix"
  class="process-panel"
>
  <template v-if="$scopedSlots.business" v-slot:business="data">
    <slot name="business" v-bind="data" />
  </template>
  <template v-if="$scopedSlots.form" v-slot:form="data">
    <slot name="form" v-bind="data" />
  </template>
</my-properties-panel>
```

