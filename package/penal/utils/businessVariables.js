/**
 * BusinessVariables 读写工具
 *
 * 这套逻辑用于维护“业务扩展键值对”，其数据存放在 BPMN 元素的 extensionElements 下：
 *
 * <bpmn:extensionElements>
 *   <${prefix}:BusinessVariables>
 *     <${prefix}:Property name="xxx" value="yyy" />
 *     ...
 *   </${prefix}:BusinessVariables>
 *   ...其它扩展元素（FormData / ExecutionListener / etc）
 * </bpmn:extensionElements>
 *
 * 设计目标：
 * 1) 读：把多个 BusinessVariables 容器里的 Property 合并成一个 { [name]: value } 视图，便于 UI 使用
 * 2) 写：更新已有 key 用 updateModdleProperties；新增 key 则构建/替换 extensionElements，且保留其它扩展元素
 *
 * 说明：
 * - 目前本仓库的 descriptor 里仅 flowable 声明了 BusinessVariables 类型；因此该能力主要用于 prefix=flowable 的场景。
 * - 这里的“合并”策略会把多个 BusinessVariables 容器压扁为一个容器写回（保留其它扩展元素不变）。
 */

/**
 * BusinessVariables 容器的 $type。
 *
 * @param {string} prefix camunda/activiti/flowable 等引擎前缀
 * @returns {string} 形如 `${prefix}:BusinessVariables`
 */
export function getBusinessVariablesTag(prefix) {
  return `${prefix}:BusinessVariables`;
}

/**
 * 读取当前元素上 BusinessVariables 的值，生成 UI 友好的视图。
 *
 * @param {Object} options
 * @param {any} options.bpmnElement bpmn-js 的 element（不是 businessObject）
 * @param {string} options.prefix 引擎前缀
 * @returns {{
 *   tag: string,
 *   values: Record<string, string>,
 *   indexes: Record<string, number>,
 *   elements: any[],
 *   otherExtensionList: any[]
 * }}
 * tag: 容器类型（`${prefix}:BusinessVariables`）
 * values: 聚合后的键值视图（给 UI 展示）
 * indexes: name -> elements 下标（便于 O(1) 更新）
 * elements: 聚合后的 `${prefix}:Property` moddle 实例数组（用于 updateModdleProperties）
 * otherExtensionList: 除 BusinessVariables 外的其它 extensionElements.values（写回时需要原样保留）
 */
export function readBusinessVariables({ bpmnElement, prefix }) {
  const tag = getBusinessVariablesTag(prefix);
  const extensionValues = bpmnElement?.businessObject?.extensionElements?.values || [];

  const otherExtensionList = [];
  const containers = [];

  // 单次遍历分区：BusinessVariables 容器 vs 其它扩展元素
  extensionValues.forEach(ex => {
    if (ex?.$type === tag) {
      containers.push(ex);
    } else {
      otherExtensionList.push(ex);
    }
  });

  // 将多个容器的 values 合并成一个 Property 列表
  const elements = containers.reduce((pre, current) => pre.concat(current?.values || []), []);

  const indexes = {};
  const values = elements.reduce((obj, elem, index) => {
    obj[elem.name] = elem.value;
    indexes[elem.name] = index;
    return obj;
  }, {});

  return { tag, values, indexes, elements, otherExtensionList };
}

/**
 * 写入/更新一个业务扩展键值。
 *
 * 更新策略：
 * - 若 key 已存在：直接 updateModdleProperties(bpmnElement, property, { value })，避免重建整个 extensionElements
 * - 若 key 不存在：创建 `${prefix}:Property` 并构建新的 `${prefix}:BusinessVariables` 容器，再用 updateProperties 写回
 *
 * 注意：
 * - “新增 key” 分支会把 BusinessVariables 重建为单一容器（其它扩展元素保持原样）。
 * - 返回的是最新 state（便于调用者同步 UI 缓存）。
 *
 * @param {Object} options
 * @param {any} options.bpmnElement
 * @param {string} options.prefix
 * @param {string} options.name 业务变量名
 * @param {string} options.value 业务变量值
 * @param {any} options.modeling bpmn-js modeling 服务
 * @param {any} options.moddle bpmn-js moddle 服务
 * @param {ReturnType<typeof readBusinessVariables>} [options.state] 可选：调用方传入已读取的 state，减少重复解析
 * @returns {ReturnType<typeof readBusinessVariables> | undefined}
 */
export function writeBusinessVariable({ bpmnElement, prefix, name, value, modeling, moddle, state }) {
  if (!bpmnElement || !modeling || !moddle) return;

  // 优先复用外部传入的 state，避免多次扫描 extensionElements
  const currentState = state || readBusinessVariables({ bpmnElement, prefix });
  const { tag, indexes, elements, otherExtensionList } = currentState;

  // 已存在：仅更新 value（name 不变，无需重复写）
  if (name in indexes) {
    const index = indexes[name];
    modeling.updateModdleProperties(bpmnElement, elements[index], { value });
    return { ...currentState, values: { ...currentState.values, [name]: value } };
  }

  // 不存在：创建新 Property，并把 BusinessVariables 容器写回到 extensionElements
  const nextElements = [...elements];
  const newPropertyObject = moddle.create(`${prefix}:Property`, { name, value });
  nextElements.push(newPropertyObject);

  const propertiesObject = moddle.create(tag, { values: nextElements });
  const extensions = moddle.create("bpmn:ExtensionElements", {
    values: otherExtensionList.concat([propertiesObject])
  });

  modeling.updateProperties(bpmnElement, { extensionElements: extensions });

  return readBusinessVariables({ bpmnElement, prefix });
}
