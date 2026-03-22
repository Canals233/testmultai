/**
 * @file MessageBus.ts
 * @description 内存消息总线 - 实现 Agent 间的异步消息传递
 *
 * 架构示意：
 *
 *   Agent A ──publish──→ ┌────────────┐ ──deliver──→ Agent B
 *   Agent B ──publish──→ │ MessageBus │ ──deliver──→ Agent C
 *   Agent C ──publish──→ └────────────┘ ──deliver──→ Agent A
 *                              │
 *                        [消息队列 + 订阅者注册表]
 *
 * 特性：
 * - 支持点对点消息（to: agentName）
 * - 支持广播消息（to: "broadcast"）
 * - 消息历史记录，便于调试
 * - 同步派发（简化实现，适合 demo）
 */

import { Message } from './Message.js';

/** 消息处理器类型 */
export type MessageHandler = (message: Message) => Promise<void> | void;

/**
 * 内存消息总线
 * 负责注册 Agent 订阅者，并路由消息到正确的接收者
 */
export class MessageBus {
  /** 订阅者注册表：agentName => handler */
  private subscribers: Map<string, MessageHandler> = new Map();

  /** 消息历史（用于调试和审计） */
  private history: Message[] = [];

  /**
   * 注册 Agent 订阅者
   * @param agentName - Agent 名称
   * @param handler - 消息处理函数
   */
  subscribe(agentName: string, handler: MessageHandler): void {
    this.subscribers.set(agentName, handler);
    console.log(`[MessageBus] 注册订阅者: ${agentName}`);
  }

  /**
   * 取消订阅
   * @param agentName - Agent 名称
   */
  unsubscribe(agentName: string): void {
    this.subscribers.delete(agentName);
  }

  /**
   * 发布消息
   * 根据 message.to 路由到目标 Agent 或广播给所有订阅者
   * @param message - 要发布的消息
   */
  async publish(message: Message): Promise<void> {
    this.history.push(message);

    console.log(
      `[MessageBus] 投递消息: ${message.from} ──[${message.type}]──→ ${message.to}`
    );

    if (message.to === 'broadcast') {
      // 广播给所有订阅者（排除发送者自身）
      const promises: Promise<void>[] = [];
      for (const [name, handler] of this.subscribers) {
        if (name !== message.from) {
          promises.push(Promise.resolve(handler(message)));
        }
      }
      await Promise.all(promises);
    } else {
      const handler = this.subscribers.get(message.to);
      if (!handler) {
        console.warn(`[MessageBus] 警告: 找不到订阅者 "${message.to}"`);
        return;
      }
      await Promise.resolve(handler(message));
    }
  }

  /**
   * 获取消息历史
   */
  getHistory(): ReadonlyArray<Message> {
    return [...this.history];
  }

  /**
   * 打印消息摘要（调试用）
   */
  printSummary(): void {
    console.log('\n[MessageBus] ── 消息历史摘要 ──');
    this.history.forEach((msg, i) => {
      console.log(
        `  #${i + 1} [${msg.phase}] ${msg.from} → ${msg.to}: ${msg.type}`
      );
    });
    console.log(`[MessageBus] 共 ${this.history.length} 条消息\n`);
  }
}
