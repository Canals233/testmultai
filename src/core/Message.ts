/**
 * @file Message.ts
 * @description 消息类型定义 - Multi-Agent 通信协议
 *
 * 消息流示意：
 * ┌─────────────────────────────────────────────────┐
 * │  Orchestrator ──→ ResearchAgent  (TASK_ASSIGN)  │
 * │  ResearchAgent ──→ Orchestrator  (RESEARCH_DONE)│
 * │  Orchestrator ──→ CodeAgent      (CODE_REQUEST) │
 * │  CodeAgent ──→ Orchestrator      (CODE_DONE)    │
 * │  Orchestrator ──→ ReviewAgent    (REVIEW_REQUEST│
 * │  ReviewAgent ──→ Orchestrator    (REVIEW_DONE)  │
 * └─────────────────────────────────────────────────┘
 */

/** 消息类型枚举 */
export enum MessageType {
  TASK_ASSIGN = 'TASK_ASSIGN',
  RESEARCH_DONE = 'RESEARCH_DONE',
  CODE_REQUEST = 'CODE_REQUEST',
  CODE_DONE = 'CODE_DONE',
  REVIEW_REQUEST = 'REVIEW_REQUEST',
  REVIEW_DONE = 'REVIEW_DONE',
  BROADCAST = 'BROADCAST',
  ERROR = 'ERROR',
}

/** 阶段枚举（与状态机对应） */
export enum Phase {
  IDLE = 'idle',
  PLANNING = 'planning',
  EXECUTING = 'executing',
  REVIEWING = 'reviewing',
  DONE = 'done',
}

/** 消息元数据 */
export interface MessageMetadata {
  taskId: string;
  sessionId: string;
  parentMsgId: string | null;
}

/**
 * Multi-Agent 通信消息接口
 */
export interface Message {
  id: string;
  timestamp: string;
  from: string;
  to: string;
  type: MessageType;
  phase: Phase;
  retryCount: number;
  payload: Record<string, unknown>;
  metadata: MessageMetadata;
}

/**
 * 生成简单的 UUID v4（无外部依赖）
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 创建标准消息工厂函数
 */
export function createMessage(
  params: Omit<Message, 'id' | 'timestamp'>
): Message {
  return {
    id: generateUUID(),
    timestamp: new Date().toISOString(),
    ...params,
  };
}
