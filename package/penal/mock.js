export default {
  users: async param => ({
    total: 2,
    page: 1,
    size: 10,
    list: [
      { name: "张三", id: "zhang3", depart: { name: "技术部" }, role: { name: "管理员" } },
      { name: "李四", id: "li4", depart: { name: "业务部" }, role: { name: "用户" } }
    ]
  }),
  departs: async param => [{ name: "公司", id: "chick", children: [{ name: "技术部", id: "jiji" }] }],
  roles: async param => [{ name: "管理员", id: "admin" }]
};
