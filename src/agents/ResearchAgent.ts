/**
 * @file ResearchAgent.ts
 * @description 研究 Agent - 分析任务需求，产出研究报告
 *
 * 职责：
 * - 接收 TASK_ASSIGN 消息
 * - 解析任务描述，提炼关键需求
 * - 生成结构化研究报告（算法分析、边界条件、实现要点）
 * - 将报告通过 RESEARCH_DONE 消息返回给 Orchestrator
 *
 * 处理流程：
 *
 *   [TASK_ASSIGN] 收到任务
 *         │
 *         ▼
 *   分析任务关键词
 *         │
 *         ▼
 *   生成研究报告
 *         │
 *         ▼
 *   [RESEARCH_DONE] 返回报告
 */

import { BaseAgent } from './BaseAgent.js';
import { Message, MessageType, Phase } from '../core/Message.js';
import { MessageBus } from '../core/MessageBus.js';

export class ResearchAgent extends BaseAgent {
  constructor(bus: MessageBus) {
    super('ResearchAgent', bus);
  }

  /**
   * 处理收到的消息
   */
  async onMessage(message: Message): Promise<void> {
    if (message.type === MessageType.TASK_ASSIGN) {
      await this.handleTaskAssign(message);
    }
  }

  /**
   * 处理任务分配，生成研究报告
   * @param message - TASK_ASSIGN 消息
   */
  private async handleTaskAssign(message: Message): Promise<void> {
    this.phase = Phase.PLANNING;
    const task = message.payload.task as string;

    this.log(`收到任务: "${task}"`);
    this.log('开始分析需求...');

    // 模拟异步分析过程
    await this.sleep(300);

    const report = this.generateReport(task);
    this.log('研究报告生成完毕');

    // 返回研究报告给 Orchestrator
    await this.send(
      message.from,
      MessageType.RESEARCH_DONE,
      { report, originalTask: task },
      message.id,
      message.retryCount,
      message.metadata.taskId,
      message.metadata.sessionId
    );
  }

  /**
   * 根据任务描述生成结构化研究报告
   * 这里模拟 AI 分析过程（实际可调用 LLM API）
   * @param task - 任务描述
   * @returns 结构化研究报告字符串
   */
  private generateReport(task: string): string {
    const taskLower = task.toLowerCase();

    // 识别任务类型
    let algorithmType = '通用算法';
    let complexity = 'O(n)';
    let keyPoints: string[] = [];
    let edgeCases: string[] = [];

    if (taskLower.includes('二分') || taskLower.includes('binary search')) {
      algorithmType = '二分查找（Binary Search）';
      complexity = 'O(log n)';
      keyPoints = [
        '1. 数组必须已排序（升序或降序）',
        '2. 使用 left、right、mid 三个指针',
        '3. mid = Math.floor((left + right) / 2) 防止整数溢出',
        '4. 根据 arr[mid] 与 target 的比较更新边界',
        '5. 循环条件：left <= right',
      ];
      edgeCases = [
        '- 空数组：直接返回 -1',
        '- 单元素数组：直接比较',
        '- 目标值不在数组中：返回 -1',
        '- 目标值在数组边界（第一个/最后一个元素）',
        '- 重复元素（返回任意一个匹配位置）',
      ];
    } else if (taskLower.includes('排序') || taskLower.includes('sort')) {
      algorithmType = '排序算法';
      complexity = 'O(n log n)';
      keyPoints = ['1. 选择合适的排序算法', '2. 处理相等元素', '3. 稳定性考量'];
      edgeCases = ['- 空数组', '- 单元素', '- 已排序数组', '- 逆序数组'];
    } else {
      keyPoints = ['1. 理解输入输出规约', '2. 考虑边界情况', '3. 选择合适的数据结构'];
      edgeCases = ['- 空输入', '- 极端值', '- 无效输入'];
    }

    return `
# 任务研究报告

## 任务描述
${task}

## 算法分析
- 类型：${algorithmType}
- 时间复杂度：${complexity}
- 空间复杂度：O(1)（迭代实现）

## 实现要点
${keyPoints.join('\n')}

## 边界条件
${edgeCases.join('\n')}

## 函数签名建议
\`\`\`typescript
/**
 * 在已排序数组中查找目标值
 * @param arr - 已排序的数字数组
 * @param target - 查找目标
 * @returns 目标值的索引，未找到返回 -1
 */
function binarySearch(arr: number[], target: number): number
\`\`\`

## 测试用例建议
- binarySearch([1,3,5,7,9], 5) === 2
- binarySearch([1,3,5,7,9], 1) === 0
- binarySearch([1,3,5,7,9], 9) === 4
- binarySearch([1,3,5,7,9], 4) === -1
- binarySearch([], 1) === -1
`.trim();
  }

  /** 模拟异步延迟 */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
