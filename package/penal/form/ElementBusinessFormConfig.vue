<template>
  <div class="panel-tab__content">
    <slot name="form" :id="id" :formKey="formKey" :setFormKey="setFormKey" :values="values" :emit="emit"></slot>
  </div>
</template>

<script>
import { readBusinessVariables, writeBusinessVariable } from "../utils/businessVariables";

export default {
  name: "ElementBusinessFormConfig",
  props: {
    id: String
  },
  inject: {
    prefix: "prefix"
  },
  data() {
    return {
      formKey: "",
      values: {}
    };
  },
  watch: {
    id: {
      immediate: true,
      handler(id) {
        if (id?.length) {
          this.reload();
        }
      }
    }
  },
  methods: {
    reload() {
      this.bpmnElement = window.bpmnInstances?.bpmnElement;
      if (!this.bpmnElement) return;

      this.formKey = this.bpmnElement.businessObject?.formKey || "";

      const state = readBusinessVariables({ bpmnElement: this.bpmnElement, prefix: this.prefix });
      this.values = state.values;
    },
    setFormKey(formKey) {
      const { modeling } = window.bpmnInstances || {};
      if (!modeling || !this.bpmnElement) return;
      this.formKey = formKey || "";
      modeling.updateProperties(this.bpmnElement, { formKey: this.formKey });
    },
    emit(name, value) {
      const { modeling, moddle } = window.bpmnInstances || {};
      if (!modeling || !moddle || !this.bpmnElement) return;
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
      this.values = nextState.values;
    }
  },
  beforeDestroy() {
    this.bpmnElement = null;
  }
};
</script>
