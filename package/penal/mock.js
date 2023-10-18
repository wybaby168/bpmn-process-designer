const range = (num, mapper) => new Array(num).fill(0).map((v, i) => mapper(i));
const users = range(20, i => ({ name: `张三${i}`, id: `zhang3${i}`, depart: { name: "技术部" }, role: { name: "管理员" } }))
  .concat(range(20,i => ({ name: `李四${i}`, id: `li4${i}`, depart: { name: "业务部" }, role: { name: "用户" } })));
const pager = (page, size) => {
  const start = (page - 1) * size;
  return users.slice(start, start + size);
};

export default {
  users: async ({ page, size }) => ({
    total: 40,
    page,
    size,
    list: pager(page, size)
  }),
  departs: async param => [{ name: "公司", id: "chick", children: [{ name: "技术部", id: "jiji" }] }],
  roles: async param => [{ name: "管理员", id: "admin" }]
};
