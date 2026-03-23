# Multi-Agent TypeScript Demo

基于 **LangGraph 风格**的纯 TypeScript Multi-Agent 架构，零框架依赖，展示 Research → Code → Review 完整工作流。

---

## 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                   用户输入任务描述                         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  OrchestratorAgent                       │
│                                                          │
│  · 状态机驱动，管理整个工作流生命周期                       │
│  · 接收各 Agent 响应，决定下一步动作                       │
│  · 处理重试逻辑（最多 3 次）                               │
└──────┬────────────────┬───────────────┬─────────────────┘
       │                │               │
       ▼                ▼               ▼
 ResearchAgent      CodeAgent      ReviewAgent
 (需求分析)        (代码生成)      (代码审查)
```

所有 Agent 之间通过 **MessageBus** 通信，彼此解耦，Orchestrator 是唯一的调度中心。

---

## 核心模块

### 1. StateMachine — 状态机

严格管理工作流的阶段流转，非法转换会直接抛错。

```
idle ──[START_TASK]──→ planning ──[RESEARCH_COMPLETE]──→ executing
                                                              │
                                                    [CODE_COMPLETE]
                                                              │
                                                              ▼
                                                          reviewing
                                                         /          \
                                            [APPROVED]              [REJECTED]
                                                /                        \
                                             done                    executing（重试）
                                                                          │
                                                              重试 >= 3 次后
                                                                          ▼
                                                                        done（失败）
```

状态转换表：

| 当前状态   | 触发事件              | 下一状态   |
|------------|----------------------|------------|
| IDLE       | START_TASK           | PLANNING   |
| PLANNING   | RESEARCH_COMPLETE    | EXECUTING  |
| EXECUTING  | CODE_COMPLETE        | REVIEWING  |
| REVIEWING  | REVIEW_APPROVED      | DONE       |
| REVIEWING  | REVIEW_REJECTED      | EXECUTING  |
| REVIEWING  | MAX_RETRIES_REACHED  | DONE       |

### 2. MessageBus — 消息总线

内存中的发布/订阅系统，支持点对点和广播两种模式。

```
Agent A ──publish(to: B)──→ ┌────────────┐ ──deliver──→ Agent B
Agent B ──publish(to: ALL)─→ │ MessageBus │ ──deliver──→ Agent A
                             │            │ ──deliver──→ Agent C
                             └────────────┘
                                   │
                          [订阅者注册表 + 消息历史]
```

- 点对点：`message.to = "AgentName"` → 只投递给目标
- 广播：`message.to = "broadcast"` → 投递给所有订阅者（排除发送者）
- 消息历史完整保留，便于调试

### 3. 消息协议

Agent 间通信遵循统一的消息格式：

```typescript
interface Message {
  id: string;           // UUID，唯一标识
  timestamp: string;    // ISO 时间戳
  from: string;         // 发送方 Agent 名
  to: string;           // 接收方 Agent 名
  type: MessageType;    // 消息类型
  phase: Phase;         // 发送时的当前阶段
  retryCount: number;   // 重试次数（透传）
  payload: Record<string, unknown>;  // 业务数据
  metadata: {
    taskId: string;     // 任务 ID（全链路一致）
    sessionId: string;  // 会话 ID
    parentMsgId: string | null;  // 父消息 ID（链路追踪）
  };
}
```

消息类型流转：

```
Orchestrator ──[TASK_ASSIGN]────→ ResearchAgent
ResearchAgent ──[RESEARCH_DONE]──→ Orchestrator
Orchestrator ──[CODE_REQUEST]───→ CodeAgent
CodeAgent ──[CODE_DONE]─────────→ Orchestrator
Orchestrator ──[REVIEW_REQUEST]─→ ReviewAgent
ReviewAgent ──[REVIEW_DONE]─────→ Orchestrator
```

---

## Agent 详解

### OrchestratorAgent

工作流的大脑。持有唯一的 StateMachine 实例，根据收到的消息触发状态转换并决定下一步。

关键方法：
- `startTask()` — 初始化状态机，向 ResearchAgent 分发任务
- `handleResearchDone()` — 收到报告后触发 `RESEARCH_COMPLETE`，转发给 CodeAgent
- `handleCodeDone()` — 收到代码后触发 `CODE_COMPLETE`，转发给 ReviewAgent
- `handleReviewDone()` — 核心决策点：APPROVED → done，REJECTED → 检查重试次数决定继续还是终止

### ResearchAgent

任务分析 Agent。接收任务描述，识别算法类型，生成包含以下内容的结构化报告：
- 算法类型 + 时间/空间复杂度
- 实现要点（逐步说明）
- 边界条件清单
- 函数签名建议
- 推荐测试用例

接入 LLM 时，把 `generateReport()` 换成 API 调用即可，其余逻辑不变。

### CodeAgent

代码生成 Agent。解析研究报告，生成带完整 JSDoc 注释的 TypeScript 实现。

两个关键设计：
1. **重试感知**：`retryCount > 0` 时生成改进版本（根据 Review 反馈修改代码）
2. **版本演进**：初次生成基础实现，重试后升级为泛型版 + lower/upper bound

### ReviewAgent

代码审查 Agent。从四个维度打分（各 25 分，满分 100）：

| 维度     | 检查项                                     |
|----------|--------------------------------------------|
| 正确性   | 空数组处理、循环终止条件                    |
| 可读性   | JSDoc 注释、变量命名                        |
| 性能     | 中点计算方式（位运算 vs Math.floor）        |
| 测试覆盖 | 是否包含测试用例、是否有预期值断言           |

总分 >= 60 → APPROVED，否则 REJECTED + 改进意见。首次提交额外扣 15 分，模拟真实 review 中对初稿更严格的情况。

---

## 文件结构

```
src/
├── agents/
│   ├── BaseAgent.ts          # Agent 基类（消息收发封装）
│   ├── OrchestratorAgent.ts  # 主调度 Agent（状态机 + 流程控制）
│   ├── ResearchAgent.ts      # 需求分析 Agent
│   ├── CodeAgent.ts          # 代码生成 Agent
│   └── ReviewAgent.ts        # 代码审查 Agent
├── core/
│   ├── Message.ts            # 消息类型定义 + UUID 工具 + 工厂函数
│   ├── State.ts              # AgentState 接口 + Phase 枚举
│   ├── StateMachine.ts       # 状态机（合法转换表 + transition 方法）
│   └── MessageBus.ts         # 内存消息总线（发布/订阅）
├── graph/
│   ├── state.ts              # LangGraph 风格的图状态定义
│   ├── nodes.ts              # 图节点函数（research / code / review）
│   └── graph.ts              # 图定义 + 路由逻辑（invoke / stream）
└── index.ts                  # 入口：先 stream 观察，再 invoke 获取最终结果
```

---

## 运行

```bash
npm install
npm run build
npm start
```

示例输出：

```
🚀 任务: "实现一个 TypeScript 二分查找函数"

[ResearchAgent] 生成研究报告...
[Step 1] 节点 "research" 完成，researchReport 长度: 264 字符

[CodeAgent] 第 1 次生成代码...
[Step 2] 节点 "code" 完成，generatedCode 长度: 860 字符

[ReviewAgent] 审查未通过（首次扣分严格）
[Router] 重新生成 (retry #1)

[CodeAgent] 第 2 次生成（泛型增强版）...
[ReviewAgent] 审查通过 ✅

📝 审查意见：代码结构清晰，类型安全，边界条件处理良好
🔄 总重试次数：1
```

---

## 扩展方向

1. **接入真实 LLM** — `generateReport()` / `generateCode()` 替换为 Claude / GPT API 调用
2. **新增 Agent** — TestAgent（自动跑测试）、DeployAgent（发布代码）
3. **持久化状态** — AgentState 序列化到文件/数据库，支持任务中断恢复
4. **并行执行** — 多个 CodeAgent 并行生成，ReviewAgent 选最优版本
5. **可视化** — 接入 LangSmith 或自建 dashboard 观察消息流

---

## 技术特点

- **纯 TypeScript**：仅依赖 Node.js 标准库，无 LangChain/LangGraph 等三方框架
- **状态机保护**：非法状态转换直接抛错，杜绝意外流转
- **消息可追踪**：每条消息携带 taskId + sessionId + parentMsgId，全链路可追踪
- **重试机制**：ReviewAgent 拒绝时自动重试，最多 3 次，超限优雅终止
- **双模式执行**：`graph.stream()` 逐步观察 + `graph.invoke()` 获取最终结果
