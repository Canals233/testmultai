/**
 * @file BaseAgent.ts
 * @description 所有 Agent 的基类，提供通用能力
 *
 * Agent 生命周期：
 *
 *   new Agent(name, bus)
 *         │
 *         ▼
 *   subscribe() ← 注册到 MessageBus
 *         │
 *         ▼
 *   onMessage() ← 接收消息入口（由 MessageBus 回调）
 *         │
 *         ▼
 *   handleXxx() ← 子类实现具体处理逻辑
 *         │
 *         ▼
 *   send()  ← 发布响应消息到 MessageBus
 */

import { Message, MessageType, Phase, createMessage, generateUUID } from '../core/Message.js';
import { MessageBus } from '../core/MessageBus.js';

/**
 * Agent 基类
 * 封装了消息收发的通用逻辑，子类只需实现 onMessage
 */
export abstract class BaseAgent {
  /** Agent 名称（唯一标识） */
  readonly name: string;

  /** 消息总线引用 */
  protected bus: MessageBus;

  /** Agent 当前所处阶段 */
  protected phase: Phase = Phase.IDLE;

  /**
   * @param name - Agent 唯一名称
   * @param bus - 消息总线
   */
  constructor(name: string, bus: MessageBus) {
    this.name = name;
    this.bus = bus;
    // 注册到消息总线
    this.bus.subscribe(name, (msg) => this.onMessage(msg));
  }

  /**
   * 消息接收入口（由 MessageBus 调用）
   * 子类需实现此方法处理具体消息
   * @param message - 收到的消息
   */
  abstract onMessage(message: Message): Promise<void>;

  /**
   * 向指定 Agent 发送消息
   * @param to - 目标 Agent 名称
   * @param type - 消息类型
   * @param payload - 消息负载
   * @param parentMsgId - 父消息 ID（可选）
   * @param retryCount - 重试次数（可选）
   */
  protected async send(
    to: string,
    type: MessageType,
    payload: Record<string, unknown>,
    parentMsgId: string | null = null,
    retryCount = 0,
    taskId = generateUUID(),
    sessionId = generateUUID()
  ): Promise<void> {
    const message = createMessage({
      from: this.name,
      to,
      type,
      phase: this.phase,
      retryCount,
      payload,
      metadata: {
        taskId,
        sessionId,
        parentMsgId,
      },
    });
    await this.bus.publish(message);
  }

  /**
   * 打印日志，格式：[AgentName] action
   * @param action - 动作描述
   */
  protected log(action: string): void {
    console.log(`[${this.name}] ${action}`);
  }
}
