/**
 * @file nodes.ts
 * @description 定义 LangGraph 图中的各 Agent 节点函数
 *
 * 所有节点均为纯规则模拟，不调用真实 LLM。
 * 每个节点执行时打印 [NodeName] doing...
 */

import { GraphStateType } from "./state.js";

// ─────────────────────────────────────────────
// 辅助工具
// ─────────────────────────────────────────────

/**
 * 从任务描述中提取关键算法/数据结构关键词
 */
function extractKeywords(task: string): string[] {
  const patterns: Record<string, string[]> = {
    "二分查找": ["binary search", "sorted array", "O(log n)", "low/high pointers", "mid index"],
    "快速排序": ["quick sort", "pivot", "partition", "recursion", "O(n log n)"],
    "链表": ["linked list", "node", "pointer", "head/tail", "traversal"],
    "哈希表": ["hash map", "key-value", "collision", "O(1) lookup"],
    "树": ["tree", "node", "left/right child", "traversal", "recursion"],
    "图": ["graph", "vertex", "edge", "BFS/DFS", "adjacency"],
    "动态规划": ["dynamic programming", "memoization", "subproblem", "optimal substructure"],
    "排序": ["sort", "comparison", "in-place", "stable sort"],
  };

  const keywords: string[] = [];
  for (const [pattern, kws] of Object.entries(patterns)) {
    if (task.includes(pattern)) {
      keywords.push(...kws);
    }
  }

  // 默认关键词
  if (keywords.length === 0) {
    keywords.push("algorithm", "TypeScript function", "input validation", "edge cases");
  }

  return keywords;
}

/**
 * 根据任务生成对应的 TypeScript 代码片段（规则模板）
 */
function generateCodeTemplate(task: string, report: string): string {
  if (task.includes("二分查找") || report.includes("binary search")) {
    return `/**
 * 二分查找算法
 * 在已排序数组中查找目标值，返回其索引，未找到返回 -1
 *
 * @param arr - 已排序的数字数组
 * @param target - 目标查找值
 * @returns 目标值的索引，未找到则返回 -1
 * @example
 *   binarySearch([1, 3, 5, 7, 9], 5) // => 2
 *   binarySearch([1, 3, 5, 7, 9], 4) // => -1
 */
export function binarySearch(arr: number[], target: number): number {
  if (!arr || arr.length === 0) return -1;

  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}

// 使用示例
const sorted = [1, 3, 5, 7, 9, 11, 13, 15];
console.log("查找 7:", binarySearch(sorted, 7));    // => 3
console.log("查找 4:", binarySearch(sorted, 4));    // => -1
console.log("查找 15:", binarySearch(sorted, 15));  // => 7`;
  }

  if (task.includes("快速排序")) {
    return `/**
 * 快速排序算法
 * @param arr - 待排序数组
 * @returns 排序后的新数组
 */
export function quickSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;

  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter((x) => x < pivot);
  const middle = arr.filter((x) => x === pivot);
  const right = arr.filter((x) => x > pivot);

  return [...quickSort(left), ...middle, ...quickSort(right)];
}`;
  }

  // 通用模板
  return `/**
 * 自动生成的 TypeScript 函数
 * 任务：${task}
 *
 * @param input - 输入参数
 * @returns 处理结果
 */
export function processTask(input: unknown): unknown {
  // TODO: 根据具体需求实现逻辑
  if (input === null || input === undefined) {
    throw new Error("Input cannot be null or undefined");
  }
  return input;
}`;
}

// ─────────────────────────────────────────────
// Agent 节点
// ─────────────────────────────────────────────

/**
 * ResearchAgent 节点
 *
 * 分析任务描述，提取关键点，生成结构化研究报告。
 * 不调用真实 LLM，使用规则模拟。
 *
 * @param state - 当前图状态
 * @returns 更新后的 researchReport 字段
 */
export async function researchNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[ResearchAgent] doing... 🔍");
  console.log(`  → 分析任务: "${state.task}"`);

  // 模拟分析延时
  await new Promise((r) => setTimeout(r, 100));

  const keywords = extractKeywords(state.task);

  const report = [
    `# 任务分析报告`,
    ``,
    `## 任务描述`,
    `${state.task}`,
    ``,
    `## 核心技术点`,
    keywords.map((k) => `- ${k}`).join("\n"),
    ``,
    `## 实现建议`,
    `1. 使用 TypeScript 严格模式编写`,
    `2. 添加完整的 JSDoc 文档注释`,
    `3. 包含边界条件处理（空数组、null 值）`,
    `4. 提供使用示例`,
    ``,
    `## 复杂度目标`,
    keywords.some((k) => k.includes("O(log")) ? "- 时间复杂度: O(log n)" : "- 时间复杂度: O(n) 或更优",
    `- 空间复杂度: O(1) 或 O(log n)`,
  ].join("\n");

  console.log(`  ✓ 研究报告生成完毕（${keywords.length} 个关键点）`);

  return { researchReport: report };
}

/**
 * CodeAgent 节点
 *
 * 根据 researchReport 和 task 生成 TypeScript 代码。
 * 代码为真实可运行的实现（基于关键词模板）。
 *
 * @param state - 当前图状态
 * @returns 更新后的 generatedCode 字段
 */
export async function codeNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const attempt = state.retryCount + 1;
  console.log(`\n[CodeAgent] doing... 💻 (第 ${attempt} 次生成)`);

  if (state.reviewComments) {
    console.log(`  → 根据审查意见修改: "${state.reviewComments}"`);
  }

  // 模拟生成延时
  await new Promise((r) => setTimeout(r, 100));

  let code = generateCodeTemplate(state.task, state.researchReport);

  // 如果是重试，添加改进注释
  if (state.retryCount > 0) {
    code = `// ✏️ 修订版本 v${state.retryCount + 1}：根据审查意见改进\n// 改进点: ${state.reviewComments}\n\n` + code;
  }

  console.log(`  ✓ 代码生成完毕（${code.split("\n").length} 行）`);

  return { generatedCode: code };
}

/**
 * ReviewAgent 节点
 *
 * 审查 generatedCode 的质量。
 * 规则：
 *   - 第一次审查：50% 随机通过
 *   - 第二次及之后：必须通过
 *
 * @param state - 当前图状态
 * @returns 更新后的 reviewResult、reviewComments、retryCount、finalOutput 字段
 */
export async function reviewNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log(`\n[ReviewAgent] doing... 🔎 (retryCount=${state.retryCount})`);

  // 模拟审查延时
  await new Promise((r) => setTimeout(r, 100));

  // 审查规则
  let reviewResult: "APPROVED" | "REJECTED";
  let reviewComments: string;

  const isFirstReview = state.retryCount === 0;

  if (isFirstReview && Math.random() < 0.5) {
    // 第一次随机50%拒绝
    reviewResult = "REJECTED";
    reviewComments = "代码缺少类型注释，建议添加返回类型声明；边界条件处理需要加强";
    console.log(`  ✗ 审查未通过: ${reviewComments}`);
  } else {
    // 第二次或通过
    reviewResult = "APPROVED";
    reviewComments = "代码结构清晰，类型安全，边界条件处理良好，符合 TypeScript 最佳实践";
    console.log(`  ✓ 审查通过: ${reviewComments}`);
  }

  const newRetryCount = reviewResult === "REJECTED" ? state.retryCount + 1 : state.retryCount;

  // 如果通过，生成 finalOutput
  let finalOutput = state.finalOutput;
  if (reviewResult === "APPROVED") {
    finalOutput = [
      `═══════════════════════════════════════════════════════`,
      `✅ 任务完成：${state.task}`,
      `═══════════════════════════════════════════════════════`,
      ``,
      `📋 研究报告摘要：`,
      state.researchReport.split("\n").slice(0, 8).join("\n"),
      ``,
      `💻 生成代码（经审查通过）：`,
      `───────────────────────────────────────────────────────`,
      state.generatedCode,
      `───────────────────────────────────────────────────────`,
      ``,
      `📝 审查意见：${reviewComments}`,
      `🔄 总共重试次数：${newRetryCount}`,
      `═══════════════════════════════════════════════════════`,
    ].join("\n");
  }

  return {
    reviewResult,
    reviewComments,
    retryCount: newRetryCount,
    finalOutput,
  };
}
