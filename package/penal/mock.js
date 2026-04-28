const range = (num, mapper) => new Array(num).fill(0).map((v, i) => mapper(i));
const users = range(20, i => ({ name: `张三${i}`, id: `zhang3${i}`, depart: { id: "jiji", name: "技术部" }, role: { name: "管理员" } })).concat(
  range(20, i => ({ name: `李四${i}`, id: `li4${i}`, depart: { id: "yewu", name: "业务部" }, role: { name: "用户" } }))
);
const pager = (list, page, size) => {
  const start = (page - 1) * size;
  return list.slice(start, start + size);
};

export default {
  users: async ({ page, size, name, depart, ids }) => {
    let list = users;
    if (ids) {
      const idList = ids.split(",");
      list = list.filter(user => idList.includes(user.id));
    }
    if (name) {
      list = list.filter(user => user.name.includes(name));
    }
    if (depart) {
      list = list.filter(user => user.depart?.id === depart);
    }
    return {
      total: list.length,
      page,
      size,
      list: pager(list, page, size)
    };
  },
  departs: async param => [{ name: "公司", id: "chick", children: [{ name: "技术部", id: "jiji" }] }],
  roles: async param => [{ name: "管理员", id: "admin" }]
};
