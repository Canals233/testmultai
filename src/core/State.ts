/**
 * @file State.ts
 * @description AgentState 定义与 Phase 枚举
 *
 * 状态机流转图：
 *
 *   ┌──────┐    task     ┌──────────┐   research   ┌───────────┐
 *   │ IDLE │ ──────────→ │ PLANNING │ ────────────→ │ EXECUTING │
 *   └──────┘             └──────────┘               └───────────┘
 *                                                         │
 *                              ┌──────────┐   code done  │
 *                              │ REVIEWING│ ←────────────┘
 *                              └──────────┘
 *                                 │     │
 *                    APPROVED      │     │ REJECTED (retry < 3)
 *                                  ↓     ↓
 *                              ┌──────┐  ┌───────────┐
 *                              │ DONE │  │ EXECUTING │ (re-generate)
 *                              └──────┘  └───────────┘
 *                                             │ REJECTED (retry >= 3)
 *                                             ↓
 *                                         ┌──────┐
 *                                         │ DONE │ (failed)
 *                                         └──────┘
 */

import { Phase } from './Message.js';

export { Phase };

/**
 * 全局 Agent 状态
 */
export interface AgentState {
  /** 当前阶段 */
  phase: Phase;
  /** 任务描述 */
  task: string;
  /** ResearchAgent 产出的研究报告 */
  researchReport: string | null;
  /** CodeAgent 产出的代码 */
  generatedCode: string | null;
  /** ReviewAgent 的最终结论 */
  reviewResult: 'APPROVED' | 'REJECTED' | null;
  /** 审查意见 */
  reviewComments: string | null;
  /** 当前重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 任务 ID */
  taskId: string;
  /** 会话 ID */
  sessionId: string;
  /** 是否最终完成 */
  isDone: boolean;
  /** 错误信息（如有） */
  error: string | null;
}

/**
 * 创建初始 AgentState
 */
export function createInitialState(
  task: string,
  taskId: string,
  sessionId: string
): AgentState {
  return {
    phase: Phase.IDLE,
    task,
    researchReport: null,
    generatedCode: null,
    reviewResult: null,
    reviewComments: null,
    retryCount: 0,
    maxRetries: 3,
    taskId,
    sessionId,
    isDone: false,
    error: null,
  };
}
