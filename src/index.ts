/**
 * @file index.ts
 * @description Multi-Agent 架构 Demo 入口
 *
 * 演示流程：
 *
 *   用户输入："实现一个二分查找函数"
 *       │
 *       ▼
 *   OrchestratorAgent.startTask()
 *       │
 *       ├──[TASK_ASSIGN]──→ ResearchAgent
 *       │                       │ 分析需求，生成报告
 *       │                       └──[RESEARCH_DONE]──→ Orchestrator
 *       │
 *       ├──[CODE_REQUEST]──→ CodeAgent
 *       │                       │ 根据报告生成代码
 *       │                       └──[CODE_DONE]──→ Orchestrator
 *       │
 *       ├──[REVIEW_REQUEST]──→ ReviewAgent
 *       │                         │ 审查代码质量
 *       │                         └──[REVIEW_DONE]──→ Orchestrator
 *       │
 *       └── APPROVED → 输出最终代码
 *           REJECTED → 重试（最多3次）
 *
 * 运行方式：
 *   npm run build && npm start
 */

import { MessageBus } from './core/MessageBus.js';
import { OrchestratorAgent } from './agents/OrchestratorAgent.js';
import { ResearchAgent } from './agents/ResearchAgent.js';
import { CodeAgent } from './agents/CodeAgent.js';
import { ReviewAgent } from './agents/ReviewAgent.js';
import { AgentState } from './core/State.js';

/**
 * 打印系统启动横幅
 */
function printBanner(): void {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         Multi-Agent TypeScript Demo                     ║');
  console.log('║         LangGraph 风格 · 零框架依赖 · 纯 TS 实现        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('架构:');
  console.log('  ┌─────────────────────────────────────────────┐');
  console.log('  │           OrchestratorAgent                  │');
  console.log('  │         (状态机驱动 + 消息调度)               │');
  console.log('  └────┬────────────┬────────────┬──────────────┘');
  console.log('       │            │            │');
  console.log('       ▼            ▼            ▼');
  console.log('  ResearchAgent  CodeAgent  ReviewAgent');
  console.log('  (需求分析)    (代码生成)  (代码审查)');
  console.log('');
}

/**
 * 初始化所有 Agent 并连接到消息总线
 * @param bus - 消息总线实例
 */
function initializeAgents(bus: MessageBus): OrchestratorAgent {
  console.log('🚀 初始化 Multi-Agent 系统...\n');

  // 创建所有 Agent（构造时自动注册到 MessageBus）
  const orchestrator = new OrchestratorAgent(bus);
  new ResearchAgent(bus);
  new CodeAgent(bus);
  new ReviewAgent(bus);

  console.log('✅ 所有 Agent 已就绪\n');
  return orchestrator;
}

/**
 * 主函数 - 运行 Multi-Agent 演示
 */
async function main(): Promise<void> {
  printBanner();

  // 1. 创建消息总线
  const bus = new MessageBus();

  // 2. 初始化所有 Agent
  const orchestrator = initializeAgents(bus);

  // 3. 模拟用户输入
  const userTask = '实现一个二分查找函数';
  console.log(`📝 用户任务: "${userTask}"\n`);
  console.log('─'.repeat(60));

  // 4. 启动任务，等待完成
  await new Promise<void>((resolve) => {
    orchestrator.startTask(userTask, (_finalState: Readonly<AgentState>) => {
      // 5. 打印消息历史摘要
      bus.printSummary();
      resolve();
    });
  });

  console.log('🎉 Demo 运行完毕！');
}

// 运行
main().catch((err) => {
  console.error('❌ 运行时错误:', err);
  process.exit(1);
});
