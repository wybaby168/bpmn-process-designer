<template>
  <div style="margin-top: 16px">
    <el-row>
      <h4><b>审批人设置</b></h4>
      <el-radio-group v-model="dataType" @change="changeDataType">
        <el-radio label="USERS">指定用户</el-radio>
        <el-radio label="GROUPS">多候选人</el-radio>
        <el-radio label="INITIATOR">发起人</el-radio>
      </el-radio-group>
    </el-row>
    <el-row>
      <div v-if="dataType === 'USERS'">
        <div v-if="userTaskForm.assignee">
          已选中：<el-tag>{{ userTaskForm.assignee }}</el-tag>
        </div>
        <div class="element-drawer__button">
          <el-button size="mini" type="primary" icon="el-icon-plus" @click="selectAssignee">选择用户</el-button>
        </div>
      </div>
      <div v-if="dataType === 'GROUPS'">
        <el-form-item label="候选用户">
          <el-tag :key="item" v-for="item in userTaskForm.candidateUsers" effect="plain" closable @close="removeCandidates(item)">{{ item }}</el-tag>
          <div>
            <el-button size="mini" type="primary" icon="el-icon-plus" @click="selectCandidates">选择用户</el-button>
          </div>
        </el-form-item>
        <el-form-item label="候选部门">
          <tree-select
            :width="320"
            :height="400"
            size="mini"
            :data="data.departs"
            multiple
            clearable
            checkStrictly
            nodeKey="id"
            v-model="candidateDeparts"
            @checked="updateElementTask('candidateGroups')"
          >
          </tree-select>
        </el-form-item>
        <el-form-item label="候选角色">
          <el-select v-model="candidateRoles" multiple collapse-tags @change="updateElementTask('candidateGroups')">
            <el-option v-for="d in data.roles" :key="d.id" :label="d.name" :value="`ROLE-${d.id}:${d.name}`" />
          </el-select>
        </el-form-item>
      </div>
    </el-row>
    <el-row>
      <div v-show="multiInstance">
        <el-divider />
        <h4><b>多实例审批方式</b></h4>
        <el-row style="padding-left: 25px">
          <el-radio-group v-model="multiLoopType" @change="changeMultiLoopType">
            <el-row><el-radio label="Null">无</el-radio></el-row>
            <el-row><el-radio label="SequentialMultiInstance">会签（需所有审批人同意）</el-radio></el-row>
            <el-row><el-radio label="ParallelMultiInstance">或签（一名审批人同意即可）</el-radio></el-row>
          </el-radio-group>
        </el-row>
        <el-row v-if="multiLoopType !== 'Null'">
          <el-tooltip content="开启后，实例需按顺序轮流审批" placement="top-start" @click.stop.prevent>
            <i class="header-icon el-icon-info"></i>
          </el-tooltip>
          <span class="custom-label">顺序审批：</span>
          <el-switch v-model="isSequential" @change="changeMultiLoopType(multiLoopType)" />
        </el-row>
      </div>
    </el-row>

    <el-row>
      <h4><b>其他设置</b></h4>
      <el-form-item label="到期时间">
        <el-date-picker
          v-model="userTaskForm.dueDate"
          type="datetime"
          style="width: 100%"
          clearable
          @change="updateElementTask('dueDate')"
          placeholder="选择到期时间"
        >
        </el-date-picker>
      </el-form-item>
      <el-form-item label="跟踪时间">
        <el-date-picker
          style="width: 100%"
          v-model="userTaskForm.followUpDate"
          type="datetime"
          clearable
          @change="updateElementTask('followUpDate')"
          placeholder="选择跟踪时间"
        >
        </el-date-picker>
      </el-form-item>
      <el-form-item label="优先级">
        <el-input v-model="userTaskForm.priority" clearable @change="updateElementTask('priority')" />
      </el-form-item>
    </el-row>
    <user-select ref="user" />
  </div>
</template>

<script>
import UserSelect from "../dialog/UserSelect";
import TreeSelect from "../dialog/TreeSelect";

/**
 * 对树进行深度map
 * @param tree 树
 * @param mapper 映射
 * @param childKey 儿子节点的key
 * @param mappedKey 映射后的key
 * @example const tree = [...];  const mappedTree = mapTree(tree, item => ({ title: item.name, key: item.path }), 'routes')
 */
export function mapTree(tree, mapper, childKey = "children", mappedKey = childKey) {
  return tree.map((node, index) => {
    const mapped = mapper(node, tree, index);
    if (node[childKey]) {
      mapped[mappedKey] = mapTree(node[childKey], mapper, childKey, mappedKey);
    }
    return mapped;
  });
}

export default {
  name: "UserTask",
  components: { UserSelect, TreeSelect },
  props: {
    id: String,
    type: String
  },
  data() {
    const defaultTaskForm = {
      assignee: "",
      candidateUsers: [],
      candidateGroups: [],
      dueDate: "",
      followUpDate: "",
      priority: ""
    };
    return {
      dataType: "USERS",
      defaultTaskForm,
      userTaskForm: {},
      data: {
        departs: [],
        roles: []
      },
      isSequential: false,
      multiLoopType: "Null"
    };
  },
  computed: {
    multiInstance() {
      return this.dataType === "GROUPS";
    },
    candidateDeparts: {
      get() {
        const { candidateGroups } = this.userTaskForm;
        return (candidateGroups || []).filter(candidate => candidate.startsWith("DEPART-"));
      },
      set(departs) {
        const { candidateGroups } = this.userTaskForm;
        this.userTaskForm.candidateGroups = [...(candidateGroups || []).filter(candidate => !candidate.startsWith("DEPART-")), ...departs];
      }
    },
    candidateRoles: {
      get() {
        const { candidateGroups } = this.userTaskForm;
        return (candidateGroups || []).filter(candidate => candidate.startsWith("ROLE-"));
      },
      set(roles) {
        const { candidateGroups } = this.userTaskForm;
        this.userTaskForm.candidateGroups = [...roles, ...(candidateGroups || []).filter(candidate => !candidate.startsWith("ROLE-"))];
      }
    }
  },
  inject: ["provider"],
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
    // 核心，处理xml
    resetTaskForm() {
      for (let key in this.defaultTaskForm) {
        let value;
        if (key === "candidateUsers" || key === "candidateGroups") {
          value = this.bpmnElement?.businessObject[key] ? this.bpmnElement.businessObject[key].split(",") : [];
        } else {
          value = this.bpmnElement?.businessObject[key] || this.defaultTaskForm[key];
        }
        this.$set(this.userTaskForm, key, value);
      }
      this.loadData();
      const {
        userTaskForm: { assignee, candidateGroups, candidateUsers }
      } = this;
      if (assignee?.startsWith("${initiator}")) {
        this.dataType = "INITIATOR";
      } else if (candidateGroups?.length || candidateUsers?.length) {
        this.dataType = "GROUPS";
      } else {
        this.dataType = "USERS";
      }
    },
    // 加载数据
    async loadData() {
      const { departs, roles } = this.provider;
      this.data.departs = mapTree(await departs(), node => {
        node.id = `DEPART-${node.id}:${node.name}`;
        return node;
      });
      this.data.roles = await roles();
    },
    // 准备更新属性
    applyKeyValue(taskAttr, key) {
      if (key === "candidateUsers" || key === "candidateGroups") {
        taskAttr[key] = this.userTaskForm[key] && this.userTaskForm[key].length ? this.userTaskForm[key].join() : null;
      } else {
        taskAttr[key] = this.userTaskForm[key] || null;
      }
    },
    // 更新到节点数据
    updateElementTask(key) {
      const taskAttr = Object.create(null);
      if (key) {
        this.applyKeyValue(taskAttr, key);
      } else {
        for (let key in this.userTaskForm) {
          this.applyKeyValue(taskAttr, key);
        }
      }
      window.bpmnInstances.modeling.updateProperties(this.bpmnElement, taskAttr);
    },
    // 选择执行人
    async selectAssignee() {
      const [id, name] = this.userTaskForm.assignee?.split(":") || [];
      const values = await this.$refs.user.select(false, id ? [{ id, name }] : []);
      if (values.length) {
        const [{ id, name }] = values;
        this.userTaskForm.assignee = `${id}:${name}`;
      } else {
        this.userTaskForm.assignee = "";
      }
      this.updateElementTask("assignee");
    },
    // 选择候选人
    async selectCandidates() {
      const selected = (this.userTaskForm.candidateUsers || []).map(key => {
        const [id, name] = key.split(":");
        return { id, name };
      });
      const values = await this.$refs.user.select(true, selected);
      this.userTaskForm.candidateUsers = values.map(({ id, name }) => `${id}:${name}`);
      this.updateElementTask("candidateUsers");
    },
    // 删除候选人
    removeCandidates(key) {
      this.userTaskForm.candidateUsers = this.userTaskForm.candidateUsers.filter(item => item !== key);
      this.updateElementTask("candidateUsers");
    },
    // 改变数据类型
    changeDataType(val) {
      // 每次都重置
      this.changeMultiLoopType("Null");
      // 清空 userTaskForm 所有属性值
      const { userTaskForm } = this;
      Object.keys(userTaskForm).forEach(key => (userTaskForm[key] = null));
      if (val === "GROUPS") {
        userTaskForm.assignee = "";
        this.loadData();
      } else if (val === "INITIATOR") {
        userTaskForm.assignee = "${initiator}" + ":流程发起人";
      }
      this.updateElementTask();
    },
    changeMultiLoopType(type) {
      this.multiLoopType = type;
      // 取消多实例配置
      if (type === "Null") {
        window.bpmnInstances.modeling.updateProperties(this.bpmnElement, { loopCharacteristics: null, assignee: null });
        return;
      }
      this.multiLoopInstance = window.bpmnInstances.moddle.create("bpmn:MultiInstanceLoopCharacteristics", { isSequential: this.isSequential });
      // 更新多实例配置
      window.bpmnInstances.modeling.updateProperties(this.bpmnElement, {
        loopCharacteristics: this.multiLoopInstance,
        assignee: "${assignee}"
      });
      // 完成条件
      let completionCondition = null;
      // 会签
      if (type === "SequentialMultiInstance") {
        completionCondition = window.bpmnInstances.moddle.create("bpmn:FormalExpression", { body: "${nrOfCompletedInstances >= nrOfInstances}" });
      }
      // 或签
      if (type === "ParallelMultiInstance") {
        completionCondition = window.bpmnInstances.moddle.create("bpmn:FormalExpression", { body: "${nrOfCompletedInstances > 0}" });
      }
      // 更新模块属性信息
      window.bpmnInstances.modeling.updateModdleProperties(this.bpmnElement, this.multiLoopInstance, {
        collection: "${multiInstanceHandler.getUserIds(execution)}",
        elementVariable: "assignee",
        completionCondition
      });
    }
  },
  beforeDestroy() {
    this.bpmnElement = null;
  }
};
</script>
<style lang="scss">
.el-row .el-radio-group {
  margin-bottom: 15px;
  .el-radio {
    line-height: 28px;
  }
}
.el-tag {
  margin-bottom: 10px;
  + .el-tag {
    margin-left: 10px;
  }
}

.custom-label {
  padding-left: 5px;
  font-weight: 500;
  font-size: 14px;
  color: #606266;
}
</style>
