<template>
  <div style="margin-top: 16px">
    <el-form-item label="实现方式">
      <el-radio-group v-model="implementationType" @change="handleImplTypeChange">
        <el-radio label="class">Java 类</el-radio>
        <el-radio label="delegateExpression">委托表达式</el-radio>
        <el-radio label="expression">表达式</el-radio>
        <el-radio label="external">外部任务</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item v-if="implementationType === 'class'" label="Java 类">
      <el-input
        v-model="serviceTaskForm.class"
        clearable
        placeholder="示例：org.flowable.MyJavaDelegate"
        @input="updateElementTask"
        @change="updateElementTask"
      />
    </el-form-item>

    <el-form-item v-if="implementationType === 'delegateExpression'" label="委托表达式">
      <el-input
        v-model="serviceTaskForm.delegateExpression"
        clearable
        placeholder="示例：${myDelegateBean}"
        @input="updateElementTask"
        @change="updateElementTask"
      />
    </el-form-item>

    <el-form-item v-if="implementationType === 'expression'" label="表达式">
      <el-input
        v-model="serviceTaskForm.expression"
        clearable
        placeholder="示例：${printer.printMessage(execution)}"
        @input="updateElementTask"
        @change="updateElementTask"
      />
    </el-form-item>

    <el-form-item v-if="implementationType !== 'external'" label="结果变量">
      <el-input
        v-model="serviceTaskForm.resultVariable"
        clearable
        placeholder="可选：将返回值存入该流程变量"
        @input="updateElementTask"
        @change="updateElementTask"
      />
    </el-form-item>

    <template v-if="implementationType === 'external'">
      <el-form-item label="任务类型">
        <el-input v-model="serviceTaskForm.type" clearable placeholder="通常为 external" @input="updateElementTask" @change="updateElementTask" />
      </el-form-item>
      <el-form-item label="Topic">
        <el-input v-model="serviceTaskForm.topic" clearable placeholder="外部工作者订阅的 topic" @input="updateElementTask" @change="updateElementTask" />
      </el-form-item>
      <el-form-item label="任务优先级">
        <el-input
          v-model="serviceTaskForm.taskPriority"
          clearable
          placeholder="可选：覆盖流程上的 taskPriority"
          @input="updateElementTask"
          @change="updateElementTask"
        />
      </el-form-item>
    </template>
  </div>
</template>

<script>
/**
 * ServiceTask 属性面板（Flowable 6.8.0+）
 *
 * 文档来源（以官方文档为准）：
 * - Service Task（实现方式、resultVariable 等）：https://documentation.flowable.com/latest/reactmodel/bpmn/reference/service-task
 * - External Worker Task（job topic 等概念）：https://documentation.flowable.com/latest/reactmodel/bpmn/reference/external-worker-task
 *
 * 设计说明（核心实现点）：
 * - Flowable 的 Service Task 支持多种“实现方式”，在 XML 上本质是若干互斥属性：
 *   `flowable:class` / `flowable:delegateExpression` / `flowable:expression`（以及相关的 `flowable:resultVariable`）
 * - 面板需要保证“互斥字段切换”时不会残留旧属性，否则运行时会产生歧义；因此在切换实现方式时会主动清空其它实现方式对应字段。
 * - 写回时把“空字符串”统一写成 `null`，让 bpmn-js 在导出 XML 时移除该属性（与本仓库其它面板组件保持一致的写回策略）。
 *
 * 备注：
 * - 本仓库已在 `flowableDescriptor.json` 中声明了 ServiceTaskLike/ExternalCapable 等扩展属性，
 *   因此这里无需手动写 `flowable:` 前缀，直接通过 `updateProperties` 写属性名即可。
 */
export default {
  name: "ServiceTask",
  props: {
    id: String,
    type: String
  },
  data() {
    return {
      implementationType: "class",
      defaultTaskForm: {
        class: "",
        delegateExpression: "",
        expression: "",
        resultVariable: "",
        type: "",
        topic: "",
        taskPriority: ""
      },
      serviceTaskForm: {}
    };
  },
  watch: {
    id: {
      immediate: true,
      handler() {
        this.bpmnElement = window.bpmnInstances.bpmnElement;
        this.$nextTick(() => this.resetTaskForm());
      }
    }
  },
  methods: {
    /**
     * 读取 businessObject -> 表单字段，并推断当前实现方式。
     *
     * 推断优先级：
     * - class > delegateExpression > expression > external（type/topic）
     *
     * 这样可兼容：
     * - 老流程仅配置 class/delegateExpression/expression 的情况
     * - 外部任务仅配置 topic/type 的情况
     */
    resetTaskForm() {
      const bo = this.bpmnElement?.businessObject || {};
      Object.keys(this.defaultTaskForm).forEach(key => {
        const value = bo[key] || this.defaultTaskForm[key];
        this.$set(this.serviceTaskForm, key, value);
      });

      if (bo.class) {
        this.implementationType = "class";
      } else if (bo.delegateExpression) {
        this.implementationType = "delegateExpression";
      } else if (bo.expression) {
        this.implementationType = "expression";
      } else if (bo.type || bo.topic) {
        this.implementationType = "external";
      } else {
        this.implementationType = "class";
      }
    },
    /**
     * 实现方式切换时，清理互斥字段，避免 XML 同时存在多个实现属性。
     *
     * 说明：
     * - `resultVariable` 仅在 expression / class / delegateExpression 语义下有意义；
     *   external worker 模式下不使用 resultVariable，因此切到 external 时会清理它。
     */
    handleImplTypeChange() {
      if (this.implementationType === "class") {
        this.serviceTaskForm.delegateExpression = "";
        this.serviceTaskForm.expression = "";
        this.serviceTaskForm.type = "";
        this.serviceTaskForm.topic = "";
      } else if (this.implementationType === "delegateExpression") {
        this.serviceTaskForm.class = "";
        this.serviceTaskForm.expression = "";
        this.serviceTaskForm.type = "";
        this.serviceTaskForm.topic = "";
      } else if (this.implementationType === "expression") {
        this.serviceTaskForm.class = "";
        this.serviceTaskForm.delegateExpression = "";
        this.serviceTaskForm.type = "";
        this.serviceTaskForm.topic = "";
      } else if (this.implementationType === "external") {
        this.serviceTaskForm.class = "";
        this.serviceTaskForm.delegateExpression = "";
        this.serviceTaskForm.expression = "";
        this.serviceTaskForm.resultVariable = "";
      }
      this.updateElementTask();
    },
    /**
     * 将表单写回到 BPMN 元素（businessObject）。
     *
     * 核心策略：
     * - 先把所有可写字段置为 `null`（代表移除属性），再根据实现方式写入对应值；
     * - `taskPriority` 属于 ExternalCapable（扩展属性），这里允许同时配置（即使不是 external）
     *   以便与流程级的 taskPriority 配置策略保持一致（由使用方决定是否在引擎侧生效）。
     */
    updateElementTask() {
      const taskAttr = Object.create(null);

      taskAttr.class = null;
      taskAttr.delegateExpression = null;
      taskAttr.expression = null;
      taskAttr.resultVariable = null;
      taskAttr.type = null;
      taskAttr.topic = null;
      taskAttr.taskPriority = this.serviceTaskForm.taskPriority || null;

      if (this.implementationType === "class") {
        taskAttr.class = this.serviceTaskForm.class || null;
        taskAttr.resultVariable = this.serviceTaskForm.resultVariable || null;
      } else if (this.implementationType === "delegateExpression") {
        taskAttr.delegateExpression = this.serviceTaskForm.delegateExpression || null;
        taskAttr.resultVariable = this.serviceTaskForm.resultVariable || null;
      } else if (this.implementationType === "expression") {
        taskAttr.expression = this.serviceTaskForm.expression || null;
        taskAttr.resultVariable = this.serviceTaskForm.resultVariable || null;
      } else if (this.implementationType === "external") {
        taskAttr.type = this.serviceTaskForm.type || "external";
        taskAttr.topic = this.serviceTaskForm.topic || null;
      }

      window.bpmnInstances.modeling.updateProperties(this.bpmnElement, taskAttr);
    }
  },
  beforeDestroy() {
    this.bpmnElement = null;
  }
};
</script>
