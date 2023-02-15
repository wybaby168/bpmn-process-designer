<template>
  <!-- 候选用户弹窗 -->
  <el-dialog title="候选用户" :visible.sync="visible" width="60%" append-to-body>
    <el-row type="flex" :gutter="20">
      <!--部门数据-->
      <el-col :span="7">
        <el-card shadow="never" style="height: 550px">
          <div slot="header">
            <span>部门列表</span>
          </div>
          <div class="head-container">
            <el-input
              :value="departName"
              :input="filter"
              placeholder="请输入部门名称"
              clearable
              size="small"
              prefix-icon="el-icon-search"
              style="margin-bottom: 20px"
            />
            <el-tree
              v-loading="loading"
              :data="departs"
              :props="{ label: 'name', children: 'children' }"
              :expand-on-click-node="false"
              :filter-node-method="filterNode"
              ref="tree"
              default-expand-all
              @node-click="handleNodeClick"
            />
          </div>
        </el-card>
      </el-col>
      <el-col :span="17">
        <el-table
          ref="multipleTable"
          height="450"
          v-loading="loading"
          size="small"
          :data="users"
          border
          @select="handleSelect"
          @selection-change="handleSelection"
        >
          <el-table-column type="selection" width="50" align="center" />
          <el-table-column label="用户名" align="center" prop="name" />
          <el-table-column label="部门" align="center" prop="depart.name" />
          <el-table-column label="角色" align="center" prop="role.name" />
        </el-table>
        <pagination :total="pagination.total" :page.sync="pagination.page" :limit.sync="pagination.size" @pagination="loadData(true)" />
      </el-col>
    </el-row>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" :disabled="!this.selected.length" @click="handleOk">确 定</el-button>
      <el-button @click="visible = false">取 消</el-button>
    </div>
  </el-dialog>
</template>

<script>
import Pagination from "./Pagination";

const EMPTY_PAGE = () => ({
  page: 1,
  size: 10,
  total: 0
});

export default {
  name: "UserSelect",
  components: { Pagination },
  data() {
    return {
      multiple: false,
      visible: false,
      loading: false,
      departs: [],
      users: [],
      pagination: EMPTY_PAGE(),
      departName: "",
      departId: "",
      selected: []
    };
  },
  inject: ["provider"],
  methods: {
    async select(multiple, selected = []) {
      this.multiple = multiple;
      this.selected = selected;
      this.reset();
      this.visible = true;
      await this.loadData();
      return new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    },
    // 筛选部门
    filter(value) {
      this.$refs.tree.filter(value);
    },
    // 筛选节点
    filterNode(value, data) {
      if (!value) return true;
      return data.name.includes(value);
    },
    handleNodeClick(data) {
      this.departId = data.id;
      this.loadData(true);
    },
    handleSelection(selection) {
      if (this.multiple) {
        this.selected = selection;
      }
    },
    handleSelect(selection, row) {
      if (!this.multiple) {
        const table = this.$refs.multipleTable;
        table.clearSelection();
        const select = selection.some(item => item.id === row.id);
        table.toggleRowSelection(row, select);
        this.selected = select ? [row] : [];
      }
    },
    // 加载数据
    async loadData(onlyUser) {
      this.loading = true;
      try {
        const { departs, users } = this.provider;
        if (!onlyUser) {
          this.departs = await departs({ name: this.departName });
        }
        const { page, size } = this.pagination;
        const { list = [], ...pagination } = await users({ depart: this.departId, page, size });
        this.pagination = pagination;
        this.users = list;
      } finally {
        this.loading = false;
      }
    },
    reset() {
      this.departName = "";
      this.departId = "";
      this.departs = [];
      this.users = [];
      this.pagination = EMPTY_PAGE();
    },
    handleOk() {
      this.resolve(this.selected);
      this.visible = false;
      delete this.resolve;
      delete this.reject;
    }
  }
};
</script>

<style scoped></style>
