/**
 * @file StateMachine.ts
 * @description 状态机实现 - 管理 AgentState 的合法流转
 *
 * 合法转换表：
 * ┌────────────┬──────────────────────────────────────────┐
 * │ 当前状态    │ 可流转至                                  │
 * ├────────────┼──────────────────────────────────────────┤
 * │ IDLE       │ PLANNING                                  │
 * │ PLANNING   │ EXECUTING                                 │
 * │ EXECUTING  │ REVIEWING                                 │
 * │ REVIEWING  │ DONE (APPROVED) | EXECUTING (REJECTED)   │
 * │ DONE       │ (终态，不可流转)                           │
 * └────────────┴──────────────────────────────────────────┘
 */

import { Phase, AgentState } from './State.js';

/** 状态转换事件 */
export type TransitionEvent =
  | 'START_TASK'
  | 'RESEARCH_COMPLETE'
  | 'CODE_COMPLETE'
  | 'REVIEW_APPROVED'
  | 'REVIEW_REJECTED'
  | 'MAX_RETRIES_REACHED';

/** 转换规则：[当前状态, 事件] => 下一状态 */
const TRANSITION_TABLE: Map<string, Phase> = new Map([
  [`${Phase.IDLE}:START_TASK`, Phase.PLANNING],
  [`${Phase.PLANNING}:RESEARCH_COMPLETE`, Phase.EXECUTING],
  [`${Phase.EXECUTING}:CODE_COMPLETE`, Phase.REVIEWING],
  [`${Phase.REVIEWING}:REVIEW_APPROVED`, Phase.DONE],
  [`${Phase.REVIEWING}:REVIEW_REJECTED`, Phase.EXECUTING],
  [`${Phase.REVIEWING}:MAX_RETRIES_REACHED`, Phase.DONE],
]);

/**
 * 状态机类
 * 负责验证并执行状态流转，维护 AgentState 不变量
 */
export class StateMachine {
  private state: AgentState;

  constructor(initialState: AgentState) {
    this.state = { ...initialState };
  }

  /** 获取当前状态快照（只读副本） */
  getState(): Readonly<AgentState> {
    return { ...this.state };
  }

  /**
   * 执行状态转换
   * @param event - 触发转换的事件
   * @param patch - 需要合并更新的状态字段
   * @throws 如果转换不合法则抛出错误
   */
  transition(event: TransitionEvent, patch: Partial<AgentState> = {}): Phase {
    const key = `${this.state.phase}:${event}`;
    const nextPhase = TRANSITION_TABLE.get(key);

    if (!nextPhase) {
      throw new Error(
        `[StateMachine] 非法转换: phase=${this.state.phase}, event=${event}`
      );
    }

    const prevPhase = this.state.phase;
    this.state = {
      ...this.state,
      ...patch,
      phase: nextPhase,
    };

    console.log(
      `[StateMachine] ${prevPhase} ──[${event}]──→ ${nextPhase}`
    );

    return nextPhase;
  }

  /**
   * 判断是否已到达终态
   */
  isDone(): boolean {
    return this.state.phase === Phase.DONE;
  }

  /**
   * 更新状态字段（不改变 phase）
   */
  patch(updates: Partial<Omit<AgentState, 'phase'>>): void {
    this.state = { ...this.state, ...updates };
  }
}
