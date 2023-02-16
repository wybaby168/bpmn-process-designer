<template>
  <div class="panel-tab__content">
    <slot name="business" :values="values" :emit="handleChange" :id="id"></slot>
  </div>
</template>
<script>
export default {
  name: "ElementOtherConfig",
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
    changer: "changer"
  },
  watch: {
    id: {
      immediate: true,
      handler: function(id) {
        if (id && id.length) {
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
      this.bpmnElement = window.bpmnInstances.bpmnElement;
      // 其他扩展配置（兼容）
      this.otherExtensionList = [];
      // 找到业务属性的所有集合
      const properties =
        this.bpmnElement.businessObject?.extensionElements?.values?.filter(ex => {
          if (ex.$type !== this.tag) {
            this.otherExtensionList.push(ex);
          }
          return ex.$type === this.tag;
        }) || [];
      // 保存所有的业务属性字段
      this.elements = properties.reduce((pre, current) => pre.concat(current.values), []);
      // 设置值
      this.applyValues();
    },
    applyValues() {
      const indexes = {};
      this.values = this.elements.reduce((obj, elem, index) => {
        obj[elem.name] = elem.value;
        indexes[elem.name] = index;
        return obj;
      }, {});
      if (this.changer) {
        this.changer(this.values);
      }
      this.indexes = indexes;
    },
    // 核心，改变值的方法，会触发xml节点更新
    handleChange(name, value) {
      // 已经存在的key，直接更新节点
      if (name in this.indexes) {
        const index = this.indexes[name];
        window.bpmnInstances.modeling.updateModdleProperties(this.bpmnElement, this.elements[index], {
          name,
          value
        });
      } else {
        // 生成属性列表
        const elements = [...this.elements];
        // 不存在，新增key
        const newPropertyObject = window.bpmnInstances.moddle.create(`${this.prefix}:Property`, { name, value });
        elements.push(newPropertyObject);
        // 新建一个属性字段的保存列表
        const propertiesObject = window.bpmnInstances.moddle.create(this.tag, {
          values: elements
        });
        this.updateElementExtensions(propertiesObject);
      }
      this.resetValues();
    },
    updateElementExtensions(properties) {
      const extensions = window.bpmnInstances.moddle.create("bpmn:ExtensionElements", {
        values: this.otherExtensionList.concat([properties])
      });
      window.bpmnInstances.modeling.updateProperties(this.bpmnElement, {
        extensionElements: extensions
      });
    }
  },
  beforeDestroy() {
    this.bpmnElement = null;
  }
};
</script>
