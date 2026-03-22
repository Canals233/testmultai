/**
 * @file ReviewAgent.ts
 * @description 代码审查 Agent - 对生成的代码进行质量评估
 *
 * 职责：
 * - 接收 REVIEW_REQUEST 消息（含代码和研究报告）
 * - 执行多维度代码审查：
 *   · 正确性（边界条件处理）
 *   · 代码质量（可读性、注释）
 *   · 性能（时间/空间复杂度）
 *   · 测试覆盖度
 * - 给出 APPROVED / REJECTED 结论
 * - 通过 REVIEW_DONE 消息返回结果给 Orchestrator
 *
 * 审查流程：
 *
 *   [REVIEW_REQUEST] 收到审查请求
 *         │
 *         ▼
 *   ┌─────────────────────┐
 *   │ 多维度代码分析       │
 *   │  ✓ 正确性           │
 *   │  ✓ 可读性           │
 *   │  ✓ 性能             │
 *   │  ✓ 测试             │
 *   └─────────────────────┘
 *         │
 *         ▼
 *   评分 >= 阈值 ?
 *     │          │
 *    YES         NO
 *     │          │
 *  APPROVED   REJECTED + comments
 *     │          │
 *     └────┬─────┘
 *          ▼
 *   [REVIEW_DONE]
 */

import { BaseAgent } from './BaseAgent.js';
import { Message, MessageType, Phase } from '../core/Message.js';
import { MessageBus } from '../core/MessageBus.js';

/** 审查维度评分 */
interface ReviewScore {
  correctness: number;   // 正确性 0-25
  readability: number;   // 可读性 0-25
  performance: number;   // 性能   0-25
  testCoverage: number;  // 测试   0-25
}

export class ReviewAgent extends BaseAgent {
  /** 通过审查的最低分数 */
  private readonly PASS_THRESHOLD = 60;

  constructor(bus: MessageBus) {
    super('ReviewAgent', bus);
  }

  /**
   * 处理收到的消息
   */
  async onMessage(message: Message): Promise<void> {
    if (message.type === MessageType.REVIEW_REQUEST) {
      await this.handleReviewRequest(message);
    }
  }

  /**
   * 处理代码审查请求
   * @param message - REVIEW_REQUEST 消息
   */
  private async handleReviewRequest(message: Message): Promise<void> {
    this.phase = Phase.REVIEWING;
    const code = message.payload.code as string;
    const retryCount = message.retryCount;

    this.log(`开始代码审查 (第 ${retryCount + 1} 次提交)`);

    // 模拟审查耗时
    await this.sleep(350);

    const { score, comments, result } = this.reviewCode(code, retryCount);
    const totalScore = Object.values(score).reduce((a, b) => a + b, 0);

    this.log(
      `审查完成 - 总分: ${totalScore}/100 → ${result}`
    );

    await this.send(
      message.from,
      MessageType.REVIEW_DONE,
      {
        result,
        score,
        totalScore,
        comments,
        code,
      },
      message.id,
      retryCount,
      message.metadata.taskId,
      message.metadata.sessionId
    );
  }

  /**
   * 执行代码审查
   * @param code - 待审查代码
   * @param retryCount - 重试次数（模拟第一次故意挑剔）
   */
  private reviewCode(
    code: string,
    retryCount: number
  ): { score: ReviewScore; comments: string; result: 'APPROVED' | 'REJECTED' } {
    const score: ReviewScore = {
      correctness: 0,
      readability: 0,
      performance: 0,
      testCoverage: 0,
    };
    const issues: string[] = [];
    const praises: string[] = [];

    // ── 正确性检查 ──────────────────────────────────────
    if (code.includes('length === 0') || code.includes('arr.length === 0')) {
      score.correctness += 10;
      praises.push('✓ 正确处理了空数组边界条件');
    } else {
      issues.push('✗ 未处理空数组情况');
    }

    if (code.includes('left <= right') || code.includes('left < right')) {
      score.correctness += 15;
      praises.push('✓ 循环终止条件正确');
    } else {
      issues.push('✗ 循环条件可能有误');
    }

    // ── 可读性检查 ──────────────────────────────────────
    if (code.includes('/**') && code.includes('@param')) {
      score.readability += 15;
      praises.push('✓ 包含完整的 JSDoc 注释');
    } else if (code.includes('//')) {
      score.readability += 8;
      issues.push('△ 注释不够完整，建议添加 JSDoc');
    } else {
      issues.push('✗ 缺少注释');
    }

    if (code.includes('left') && code.includes('right') && code.includes('mid')) {
      score.readability += 10;
      praises.push('✓ 变量命名清晰');
    }

    // ── 性能检查 ──────────────────────────────────────
    if (code.includes('>>> 1') || code.includes('Math.floor')) {
      score.performance += 25;
      praises.push('✓ 中间值计算方式合理');
    } else {
      score.performance += 10;
      issues.push('△ 建议使用位运算 >>> 1 计算中点');
    }

    // ── 测试覆盖检查 ──────────────────────────────────────
    if (code.includes('runTests') || code.includes('test')) {
      score.testCoverage += 15;
      praises.push('✓ 包含测试用例');
    }

    if (code.includes('expected')) {
      score.testCoverage += 10;
      praises.push('✓ 测试包含预期值断言');
    }

    const totalScore = Object.values(score).reduce((a, b) => a + b, 0);

    // 第一次提交故意严格一点（模拟真实 review 场景）
    const effectiveScore = retryCount === 0 ? totalScore - 15 : totalScore;
    const result: 'APPROVED' | 'REJECTED' =
      effectiveScore >= this.PASS_THRESHOLD ? 'APPROVED' : 'REJECTED';

    if (retryCount === 0 && result === 'REJECTED') {
      issues.push(
        '⚠ 首次提交建议：可以考虑添加泛型支持，使函数更通用。'
      );
    }

    const comments = [
      `## 代码审查报告`,
      ``,
      `### 评分明细`,
      `| 维度     | 得分  | 满分 |`,
      `|----------|-------|------|`,
      `| 正确性   | ${score.correctness}    | 25   |`,
      `| 可读性   | ${score.readability}    | 25   |`,
      `| 性能     | ${score.performance}    | 25   |`,
      `| 测试覆盖 | ${score.testCoverage}    | 25   |`,
      `| **合计** | **${totalScore}** | 100  |`,
      ``,
      `### 优点`,
      ...praises,
      ``,
      `### 改进建议`,
      ...(issues.length > 0 ? issues : ['无']),
      ``,
      `### 结论：${result}`,
    ].join('\n');

    return { score, comments, result };
  }

  /** 模拟异步延迟 */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
