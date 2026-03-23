/**
 * @file graph.ts
 * @description 构建并导出 LangGraph 有向图
 *
 * 图结构：
 *   START → research → code → review
 *                              ↓
 *                    APPROVED → END
 *                    REJECTED + retryCount < 3 → code (重试)
 *                    REJECTED + retryCount >= 3 → END (强制结束)
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { GraphState, GraphStateType } from "./state.js";
import { researchNode, codeNode, reviewNode } from "./nodes.js";

/**
 * 条件路由函数：根据 reviewResult 和 retryCount 决定下一步
 *
 * @param state - 当前图状态
 * @returns 路由 key："done" 或 "code"
 */
function reviewRouter(state: GraphStateType): "done" | "code" {
  if (state.reviewResult === "APPROVED") {
    console.log("\n[Router] → 审查通过，流程结束 ✅");
    return "done";
  }

  if (state.retryCount >= 3) {
    console.log(`\n[Router] → 已达最大重试次数 (${state.retryCount})，强制结束 ⚠️`);
    return "done";
  }

  console.log(`\n[Router] → 审查未通过，重新生成代码 (retry #${state.retryCount}) 🔄`);
  return "code";
}

/**
 * 构建并编译 LangGraph 图
 *
 * 节点：
 *   - research: ResearchAgent，分析任务
 *   - code:     CodeAgent，生成代码
 *   - review:   ReviewAgent，审查代码
 *
 * 边：
 *   - START → research（固定边）
 *   - research → code（固定边）
 *   - code → review（固定边）
 *   - review → done/code（条件边）
 */
const workflow = new StateGraph(GraphState)
  .addNode("research", researchNode)
  .addNode("code", codeNode)
  .addNode("review", reviewNode)
  .addEdge(START, "research")
  .addEdge("research", "code")
  .addEdge("code", "review")
  .addConditionalEdges(
    "review",
    reviewRouter,
    {
      done: END,
      code: "code",
    }
  );

/** 编译后的图实例，可直接 invoke / stream */
export const graph = workflow.compile();

export default graph;
