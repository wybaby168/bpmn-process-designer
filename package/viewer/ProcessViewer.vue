<template>
  <div class="process-viewer" v-bind="this.$attrs">
    <div class="process-canvas" style="height: 100%;" ref="processCanvas" v-show="!loading" />
    <!-- 自定义箭头样式，用于成功状态下流程连线箭头 -->
    <defs ref="customSuccessDefs">
      <marker id="sequenceflow-end-white-success" viewBox="0 0 20 20" refX="11" refY="10" markerWidth="10" markerHeight="10" orient="auto">
        <path class="success-arrow" d="M 1 5 L 11 10 L 1 15 Z" style="stroke-width: 1px; stroke-linecap: round; stroke-dasharray: 10000, 1;"></path>
      </marker>
      <marker id="conditional-flow-marker-white-success" viewBox="0 0 20 20" refX="-1" refY="10" markerWidth="10" markerHeight="10" orient="auto">
        <path
          class="success-conditional"
          d="M 0 10 L 8 6 L 16 10 L 8 14 Z"
          style="stroke-width: 1px; stroke-linecap: round; stroke-dasharray: 10000, 1;"
        ></path>
      </marker>
    </defs>
    <!-- 自定义箭头样式，用于失败状态下流程连线箭头 -->
    <defs ref="customFailDefs">
      <marker id="sequenceflow-end-white-fail" viewBox="0 0 20 20" refX="11" refY="10" markerWidth="10" markerHeight="10" orient="auto">
        <path class="fail-arrow" d="M 1 5 L 11 10 L 1 15 Z" style="stroke-width: 1px; stroke-linecap: round; stroke-dasharray: 10000, 1;"></path>
      </marker>
      <marker id="conditional-flow-marker-white-fail" viewBox="0 0 20 20" refX="-1" refY="10" markerWidth="10" markerHeight="10" orient="auto">
        <path class="fail-conditional" d="M 0 10 L 8 6 L 16 10 L 8 14 Z" style="stroke-width: 1px; stroke-linecap: round; stroke-dasharray: 10000, 1;"></path>
      </marker>
    </defs>
    <div style="position: absolute; top: 0; left: 0; width: 100%;">
      <el-row type="flex" justify="end">
        <el-button-group key="scale-control" size="medium">
          <el-button size="medium" type="default" :plain="true" :disabled="defaultZoom <= 0.3" icon="el-icon-zoom-out" @click="processZoomOut()" />
          <el-button size="medium" type="default" style="width: 90px;">{{ Math.floor(this.defaultZoom * 10 * 10) + "%" }} </el-button>
          <el-button size="medium" type="default" :plain="true" :disabled="defaultZoom >= 3.9" icon="el-icon-zoom-in" @click="processZoomIn()" />
          <el-button size="medium" type="default" icon="el-icon-c-scale-to-original" @click="processReZoom" />
          <slot />
        </el-button-group>
      </el-row>
    </div>
  </div>
</template>

<script>
import "./viewer.scss";
import BpmnViewer from "bpmn-js/lib/Viewer";
import MoveCanvasModule from "diagram-js/lib/navigation/movecanvas";

export default {
  props: {
    xml: {
      type: String
    },
    data: {
      type: Object,
      default: () => ({
        finishedTasks: [],
        rejectedTasks: [],
        unfinishedTasks: [],
        finishedSequenceFlows: []
      }),
      description: "已完成流程元素"
    }
  },
  name: "ProcessViewer",
  data() {
    return {
      defaultZoom: 1,
      // 是否正在加载流程图
      loading: false,
      // 查看器实例
      bpmnViewer: undefined,
    };
  },
  watch: {
    xml() {
      this.importXML();
    },
    data(newInfo) {
      this.updateProcessStatus();
    }
  },
  mounted() {
    this.importXML();
  },
  methods: {
    processReZoom() {
      this.defaultZoom = 1;
      this.bpmnViewer.get("canvas").zoom("fit-viewport", "auto");
    },
    processZoomIn(zoomStep = 0.1) {
      let newZoom = Math.floor(this.defaultZoom * 100 + zoomStep * 100) / 100;
      if (newZoom > 4) {
        throw new Error("[Process Designer Warn ]: The zoom ratio cannot be greater than 4");
      }
      this.defaultZoom = newZoom;
      this.bpmnViewer.get("canvas").zoom(this.defaultZoom);
    },
    processZoomOut(zoomStep = 0.1) {
      let newZoom = Math.floor(this.defaultZoom * 100 - zoomStep * 100) / 100;
      if (newZoom < 0.2) {
        throw new Error("[Process Designer Warn ]: The zoom ratio cannot be less than 0.2");
      }
      this.defaultZoom = newZoom;
      this.bpmnViewer.get("canvas").zoom(this.defaultZoom);
    },
    // 流程图预览清空
    clearViewer() {
      if (this.$refs.processCanvas) {
        this.$refs.processCanvas.innerHTML = "";
      }
      if (this.bpmnViewer) {
        this.bpmnViewer.destroy();
      }
      this.bpmnViewer = null;
    },
    // 添加自定义箭头
    addCustomDefs() {
      const canvas = this.bpmnViewer.get("canvas");
      const svg = canvas._svg;
      const customSuccessDefs = this.$refs.customSuccessDefs;
      const customFailDefs = this.$refs.customFailDefs;
      svg.appendChild(customSuccessDefs);
      svg.appendChild(customFailDefs);
    },
    // 显示流程图
    async importXML() {
      this.clearViewer();
      if (!this.xml) return;
      try {
        this.bpmnViewer = new BpmnViewer({
          additionalModules: [
            // 移动整个画布
            MoveCanvasModule
          ],
          container: this.$refs.processCanvas
        });
        this.loading = true;
        await this.bpmnViewer.importXML(this.xml);
        this.addCustomDefs();
      } catch (e) {
        this.clearViewer();
      } finally {
        this.loading = false;
        this.updateProcessStatus();
      }
    },
    // 设置流程图元素状态
    updateProcessStatus() {
      if (this.loading || this.data == null || this.bpmnViewer == null) return;
      const { finishedTasks, rejectedTasks, unfinishedTasks, finishedSequenceFlows } = this.data;
      const canvas = this.bpmnViewer.get("canvas");
      const elementRegistry = this.bpmnViewer.get("elementRegistry");
      if (Array.isArray(finishedSequenceFlows)) {
        finishedSequenceFlows
          .filter(i => i)
          .forEach(item => {
            canvas.addMarker(item, "success");
            const element = elementRegistry.get(item);
            const conditionExpression = element.businessObject.conditionExpression;
            if (conditionExpression) {
              canvas.addMarker(item, "condition-expression");
            }
          });
      }
      if (Array.isArray(finishedTasks)) {
        finishedTasks.forEach(item => canvas.addMarker(item, "success"));
      }
      if (Array.isArray(unfinishedTasks)) {
        unfinishedTasks.forEach(item => canvas.addMarker(item, "primary"));
      }
      if (Array.isArray(rejectedTasks)) {
        rejectedTasks
          .filter(i => i)
          .forEach(item => {
            let element = elementRegistry.get(item);
            if (element.type.includes("Task")) {
              canvas.addMarker(item, "danger");
            } else {
              canvas.addMarker(item, "warning");
            }
          });
      }
    }
  },
  destroyed() {
    this.clearViewer();
  }
};
</script>

<style scoped></style>
