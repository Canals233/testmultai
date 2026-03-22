# Multi-Agent TypeScript Demo

基于 **LangGraph 风格**的纯 TypeScript Multi-Agent 架构实现，**零框架依赖**。

## 架构概览

```
╔══════════════════════════════════════════════════════╗
║              OrchestratorAgent                       ║
║            (状态机驱动 + 消息调度)                    ║
╚═══════┬═════════════╦═══════════╦═════════════════════╝
        │             ║           ║
        ▼             ▼           ▼
  ResearchAgent   CodeAgent  ReviewAgent
  (需求分析)     (代码生成)  (代码审查)
```

## 状态机

```
idle ──→ planning ──→ executing ──→ reviewing ──→ done
                           ▲              │
                           └── REJECTED ──┘ (最多3次)
```

## 消息流

| 发送方           | 接收方           | 消息类型        |
|------------------|------------------|-----------------|
| Orchestrator     | ResearchAgent    | TASK_ASSIGN     |
| ResearchAgent    | Orchestrator     | RESEARCH_DONE   |
| Orchestrator     | CodeAgent        | CODE_REQUEST    |
| CodeAgent        | Orchestrator     | CODE_DONE       |
| Orchestrator     | ReviewAgent      | REVIEW_REQUEST  |
| ReviewAgent      | Orchestrator     | REVIEW_DONE     |

## 文件结构

```
src/
├── agents/
│   ├── BaseAgent.ts          # Agent 基类
│   ├── OrchestratorAgent.ts  # 主调度 Agent
│   ├── ResearchAgent.ts      # 需求分析 Agent
│   ├── CodeAgent.ts          # 代码生成 Agent
│   └── ReviewAgent.ts        # 代码审查 Agent
├── core/
│   ├── Message.ts            # 消息类型定义 + UUID 工具
│   ├── State.ts              # AgentState + Phase 枚举
│   ├── StateMachine.ts       # 状态机实现
│   └── MessageBus.ts         # 内存消息总线
└── index.ts                  # 入口文件
```

## 快速开始

```bash
# 安装依赖
npm install

# 构建
npm run build

# 运行
npm start
```

## 技术特点

- **纯 TypeScript**：仅用 Node.js 标准库，无 LangChain/LangGraph 依赖
- **状态机驱动**：严格的状态流转，避免非法状态
- **消息总线**：解耦 Agent 间通信，支持点对点和广播
- **重试机制**：ReviewAgent 拒绝时自动重试，最多3次
- **完整注释**：JSDoc + ASCII 流程图，代码即文档
