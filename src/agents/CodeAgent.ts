/**
 * @file CodeAgent.ts
 * @description 代码生成 Agent - 根据研究报告生成高质量 TypeScript 代码
 *
 * 职责：
 * - 接收 CODE_REQUEST 消息（含研究报告）
 * - 解析报告中的算法分析与实现要点
 * - 生成带注释的 TypeScript 实现代码
 * - 将代码通过 CODE_DONE 消息返回给 Orchestrator
 *
 * 处理流程：
 *
 *   [CODE_REQUEST] 收到代码请求
 *         │
 *         ▼
 *   解析研究报告
 *         │
 *         ▼
 *   生成 TypeScript 代码
 *         │
 *         ▼
 *   [CODE_DONE] 返回代码
 */

import { BaseAgent } from './BaseAgent.js';
import { Message, MessageType, Phase } from '../core/Message.js';
import { MessageBus } from '../core/MessageBus.js';

export class CodeAgent extends BaseAgent {
  constructor(bus: MessageBus) {
    super('CodeAgent', bus);
  }

  /**
   * 处理收到的消息
   */
  async onMessage(message: Message): Promise<void> {
    if (message.type === MessageType.CODE_REQUEST) {
      await this.handleCodeRequest(message);
    }
  }

  /**
   * 处理代码生成请求
   * @param message - CODE_REQUEST 消息
   */
  private async handleCodeRequest(message: Message): Promise<void> {
    this.phase = Phase.EXECUTING;
    const report = message.payload.report as string;
    const task = message.payload.originalTask as string;
    const retryCount = message.retryCount;

    this.log(`收到代码生成请求 (重试次数: ${retryCount})`);
    this.log('分析研究报告...');

    // 模拟代码生成耗时
    await this.sleep(400);

    const code = this.generateCode(report, task, retryCount);
    this.log('代码生成完毕');

    await this.send(
      message.from,
      MessageType.CODE_DONE,
      { code, report, originalTask: task },
      message.id,
      retryCount,
      message.metadata.taskId,
      message.metadata.sessionId
    );
  }

  /**
   * 根据研究报告生成 TypeScript 代码
   * 模拟 LLM 代码生成（实际可接入 GPT/Claude API）
   * @param report - 研究报告
   * @param task - 原始任务
   * @param retryCount - 重试次数（影响生成策略）
   */
  private generateCode(report: string, task: string, retryCount: number): string {
    const taskLower = task.toLowerCase();

    if (taskLower.includes('二分') || taskLower.includes('binary search')) {
      return this.generateBinarySearch(retryCount);
    }

    // 通用代码模板
    return `
/**
 * ${task}
 * 
 * 根据需求分析自动生成
 * @version 1.${retryCount}
 */
export function solution(input: unknown): unknown {
  // TODO: 根据研究报告实现具体逻辑
  console.log('执行任务:', input);
  return null;
}
`.trim();
  }

  /**
   * 生成二分查找实现
   * retryCount > 0 时生成改进版本（模拟 Review 反馈后的修正）
   */
  private generateBinarySearch(retryCount: number): string {
    if (retryCount === 0) {
      // 初次生成：标准实现
      return `
/**
 * 二分查找算法实现
 *
 * 在已排序的数组中查找目标值，返回其索引。
 * 使用迭代方式实现，空间复杂度 O(1)。
 *
 * 算法示意：
 *
 *   arr: [1, 3, 5, 7, 9]  target: 5
 *
 *   Round 1: left=0, right=4, mid=2 → arr[2]=5 === target → 返回 2 ✓
 *
 *   arr: [1, 3, 5, 7, 9]  target: 4
 *
 *   Round 1: left=0, right=4, mid=2 → arr[2]=5 > 4  → right=1
 *   Round 2: left=0, right=1, mid=0 → arr[0]=1 < 4  → left=1
 *   Round 3: left=1, right=1, mid=1 → arr[1]=3 < 4  → left=2
 *   Round 4: left=2 > right=1 → 循环结束 → 返回 -1
 *
 * @param arr - 已排序（升序）的数字数组
 * @param target - 要查找的目标值
 * @returns 目标值的索引；未找到返回 -1
 * @example
 * binarySearch([1, 3, 5, 7, 9], 5) // => 2
 * binarySearch([1, 3, 5, 7, 9], 4) // => -1
 * binarySearch([], 1)               // => -1
 */
export function binarySearch(arr: number[], target: number): number {
  // 边界检查：空数组
  if (arr.length === 0) return -1;

  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    // 使用位运算计算中点，避免整数溢出
    const mid = (left + right) >>> 1;

    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}

// ── 测试用例 ──────────────────────────────────────────
function runTests(): void {
  const testCases: Array<{ arr: number[]; target: number; expected: number }> = [
    { arr: [1, 3, 5, 7, 9], target: 5, expected: 2 },
    { arr: [1, 3, 5, 7, 9], target: 1, expected: 0 },
    { arr: [1, 3, 5, 7, 9], target: 9, expected: 4 },
    { arr: [1, 3, 5, 7, 9], target: 4, expected: -1 },
    { arr: [], target: 1, expected: -1 },
    { arr: [42], target: 42, expected: 0 },
    { arr: [42], target: 0, expected: -1 },
  ];

  let passed = 0;
  for (const { arr, target, expected } of testCases) {
    const result = binarySearch(arr, target);
    const ok = result === expected;
    if (ok) passed++;
    console.log(\`  [\${ok ? '✓' : '✗'}] binarySearch([\${arr}], \${target}) => \${result} (expected: \${expected})\`);
  }
  console.log(\`\\n  测试结果: \${passed}/\${testCases.length} 通过\`);
}

runTests();
`.trim();
    }

    // 重试版本：添加泛型支持和更多功能
    return `
/**
 * 二分查找算法 - 增强版（v${retryCount + 1}）
 *
 * 支持泛型、自定义比较器，并提供额外的查找变体。
 *
 * @template T - 数组元素类型
 * @param arr - 已排序的数组
 * @param target - 查找目标
 * @param comparator - 比较函数（默认数值比较）
 * @returns 目标元素的索引；未找到返回 -1
 */
export function binarySearch<T>(
  arr: T[],
  target: T,
  comparator: (a: T, b: T) => number = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
): number {
  if (arr.length === 0) return -1;

  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = (left + right) >>> 1;
    const cmp = comparator(arr[mid], target);

    if (cmp === 0) return mid;
    if (cmp < 0) left = mid + 1;
    else right = mid - 1;
  }

  return -1;
}

/**
 * 查找第一个满足条件的位置（lower bound）
 * @param arr - 已排序数组
 * @param target - 目标值
 * @returns 第一个 >= target 的索引
 */
export function lowerBound(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length;

  while (left < right) {
    const mid = (left + right) >>> 1;
    if (arr[mid] < target) left = mid + 1;
    else right = mid;
  }

  return left;
}

/**
 * 查找最后一个满足条件的位置（upper bound）
 * @param arr - 已排序数组
 * @param target - 目标值
 * @returns 第一个 > target 的索引
 */
export function upperBound(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length;

  while (left < right) {
    const mid = (left + right) >>> 1;
    if (arr[mid] <= target) left = mid + 1;
    else right = mid;
  }

  return left;
}

// ── 测试用例 ──────────────────────────────────────────
function runTests(): void {
  console.log('── 基础测试 ──');
  const arr = [1, 3, 5, 7, 9];
  console.log(\`  binarySearch([1,3,5,7,9], 5) => \${binarySearch(arr, 5)} (expected: 2)\`);
  console.log(\`  binarySearch([1,3,5,7,9], 4) => \${binarySearch(arr, 4)} (expected: -1)\`);
  console.log(\`  binarySearch([], 1) => \${binarySearch([], 1)} (expected: -1)\`);

  console.log('── 泛型测试 ──');
  const words = ['apple', 'banana', 'cherry', 'date'];
  const idx = binarySearch(words, 'cherry', (a, b) => a.localeCompare(b));
  console.log(\`  binarySearch(['apple','banana','cherry','date'], 'cherry') => \${idx} (expected: 2)\`);

  console.log('── lower/upper bound 测试 ──');
  const nums = [1, 3, 3, 3, 7];
  console.log(\`  lowerBound([1,3,3,3,7], 3) => \${lowerBound(nums, 3)} (expected: 1)\`);
  console.log(\`  upperBound([1,3,3,3,7], 3) => \${upperBound(nums, 3)} (expected: 4)\`);
}

runTests();
`.trim();
  }

  /** 模拟异步延迟 */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
