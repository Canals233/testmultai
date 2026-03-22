/**
 * @file OrchestratorAgent.ts
 * @description 主调度 Agent - 驱动整个 Multi-Agent 状态机流转
 *
 * 状态机流转图：
 *
 *   idle ──[START_TASK]──→ planning
 *                               │
 *              [RESEARCH_COMPLETE]
 *                               │
 *                               ▼
 *                           executing ◄──────────────────────┐
 *                               │                             │
 *                     [CODE_COMPLETE]                [REVIEW_REJECTED]
 *                               │                    (retryCount < 3)
 *                               ▼                             │
 *                           reviewing ──────────────────────→─┘
 *                               │
 *                    [REVIEW_APPROVED]
 *                               │
 *                               ▼
 *                             done
 *
 * Orchestrator 负责：
 * 1. 接收用户任务，启动状态机
 * 2. 将任务分配给 ResearchAgent
 * 3. 收到研究报告后，触发 CodeAgent 生成代码
 * 4. 收到代码后，触发 ReviewAgent 审查
 * 5. 根据审查结果决定：通过 → done，拒绝且未超重试 → 重新生成
 * 6. 输出最终结果
 */

import { BaseAgent } from './BaseAgent.js';
import { Message, MessageType, Phase } from '../core/Message.js';
import { MessageBus } from '../core/MessageBus.js';
import { StateMachine, TransitionEvent } from '../core/StateMachine.js';
import { AgentState, createInitialState } from '../core/State.js';
import { generateUUID } from '../core/Message.js';

export class OrchestratorAgent extends BaseAgent {
  /** 状态机实例 */
  private stateMachine!: StateMachine;

  /** 任务完成时的回调 */
  private onDoneCallback?: (state: Readonly<AgentState>) => void;

  constructor(bus: MessageBus) {
    super('OrchestratorAgent', bus);
  }

  /**
   * 处理收到的消息（来自各 Agent 的响应）
   */
  async onMessage(message: Message): Promise<void> {
    switch (message.type) {
      case MessageType.RESEARCH_DONE:
        await this.handleResearchDone(message);
        break;
      case MessageType.CODE_DONE:
        await this.handleCodeDone(message);
        break;
      case MessageType.REVIEW_DONE:
        await this.handleReviewDone(message);
        break;
      default:
        this.log(`收到未知消息类型: ${message.type}`);
    }
  }

  /**
   * 启动任务 - 入口方法
   * @param taskDescription - 用户输入的任务描述
   * @param onDone - 任务完成时的回调
   */
  async startTask(
    taskDescription: string,
    onDone?: (state: Readonly<AgentState>) => void
  ): Promise<void> {
    const taskId = generateUUID();
    const sessionId = generateUUID();
    this.onDoneCallback = onDone;

    // 初始化状态机
    const initialState = createInitialState(taskDescription, taskId, sessionId);
    this.stateMachine = new StateMachine(initialState);

    this.log(`━━━ 任务启动 ━━━`);
    this.log(`任务: "${taskDescription}"`);
    this.log(`TaskID: ${taskId}`);

    // 触发状态转换：idle → planning
    this.stateMachine.transition('START_TASK', { task: taskDescription });
    this.phase = Phase.PLANNING;

    // 分配任务给 ResearchAgent
    await this.send(
      'ResearchAgent',
      MessageType.TASK_ASSIGN,
      { task: taskDescription },
      null,
      0,
      taskId,
      sessionId
    );
  }

  /**
   * 处理研究报告完成（planning → executing）
   */
  private async handleResearchDone(message: Message): Promise<void> {
    const report = message.payload.report as string;
    const task = message.payload.originalTask as string;

    this.log('收到研究报告，开始生成代码...');

    // 保存研究报告到状态
    this.stateMachine.patch({ researchReport: report });

    // 触发状态转换：planning → executing
    this.stateMachine.transition('RESEARCH_COMPLETE', { researchReport: report });
    this.phase = Phase.EXECUTING;

    const state = this.stateMachine.getState();

    // 请求 CodeAgent 生成代码
    await this.send(
      'CodeAgent',
      MessageType.CODE_REQUEST,
      { report, originalTask: task },
      message.id,
      state.retryCount,
      message.metadata.taskId,
      message.metadata.sessionId
    );
  }

  /**
   * 处理代码生成完成（executing → reviewing）
   */
  private async handleCodeDone(message: Message): Promise<void> {
    const code = message.payload.code as string;
    const report = message.payload.report as string;
    const task = message.payload.originalTask as string;

    this.log('收到生成代码，发起代码审查...');

    // 保存代码到状态
    this.stateMachine.patch({ generatedCode: code });

    // 触发状态转换：executing → reviewing
    this.stateMachine.transition('CODE_COMPLETE', { generatedCode: code });
    this.phase = Phase.REVIEWING;

    const state = this.stateMachine.getState();

    // 请求 ReviewAgent 审查代码
    await this.send(
      'ReviewAgent',
      MessageType.REVIEW_REQUEST,
      { code, report, originalTask: task },
      message.id,
      state.retryCount,
      message.metadata.taskId,
      message.metadata.sessionId
    );
  }

  /**
   * 处理代码审查结果（reviewing → done 或 reviewing → executing）
   */
  private async handleReviewDone(message: Message): Promise<void> {
    const result = message.payload.result as 'APPROVED' | 'REJECTED';
    const comments = message.payload.comments as string;
    const code = message.payload.code as string;

    this.stateMachine.patch({
      reviewResult: result,
      reviewComments: comments,
    });

    const state = this.stateMachine.getState();

    if (result === 'APPROVED') {
      this.log('✅ 代码审查通过！');

      // 状态转换：reviewing → done
      this.stateMachine.transition('REVIEW_APPROVED', {
        isDone: true,
        generatedCode: code,
      });
      this.phase = Phase.DONE;

      await this.finalize();
    } else {
      // REJECTED
      const newRetryCount = state.retryCount + 1;

      if (newRetryCount >= state.maxRetries) {
        this.log(
          `❌ 审查未通过，已达最大重试次数 (${state.maxRetries})，终止任务`
        );

        // 状态转换：reviewing → done（失败）
        this.stateMachine.transition('MAX_RETRIES_REACHED', {
          isDone: true,
          error: `达到最大重试次数 ${state.maxRetries}，最终仍未通过审查`,
        });
        this.phase = Phase.DONE;

        await this.finalize();
      } else {
        this.log(
          `⚠️  审查未通过，重试中... (${newRetryCount}/${state.maxRetries})`
        );

        // 状态转换：reviewing → executing（重试）
        this.stateMachine.transition('REVIEW_REJECTED', {
          retryCount: newRetryCount,
        });
        this.phase = Phase.EXECUTING;

        // 重新请求 CodeAgent 生成代码（携带审查意见）
        const researchReport = state.researchReport ?? '';
        await this.send(
          'CodeAgent',
          MessageType.CODE_REQUEST,
          {
            report: researchReport,
            originalTask: state.task,
            reviewComments: comments,
          },
          message.id,
          newRetryCount,
          message.metadata.taskId,
          message.metadata.sessionId
        );
      }
    }
  }

  /**
   * 任务完成，输出最终结果
   */
  private async finalize(): Promise<void> {
    const state = this.stateMachine.getState();

    console.log('\n' + '═'.repeat(60));
    console.log('  [OrchestratorAgent] ━━━ 任务完成 ━━━');
    console.log('═'.repeat(60));

    if (state.error) {
      console.log(`\n❌ 任务失败: ${state.error}`);
    } else {
      console.log('\n✅ 最终生成代码:\n');
      console.log('─'.repeat(60));
      console.log(state.generatedCode);
      console.log('─'.repeat(60));
    }

    console.log(`\n📊 统计信息:`);
    console.log(`   - 任务: ${state.task}`);
    console.log(`   - 重试次数: ${state.retryCount}`);
    console.log(`   - 审查结论: ${state.reviewResult}`);
    console.log(`   - 最终状态: ${state.phase}`);
    console.log('═'.repeat(60) + '\n');

    // 触发完成回调
    this.onDoneCallback?.(state);
  }
}
