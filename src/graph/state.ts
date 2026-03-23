/**
 * @file state.ts
 * @description 定义 LangGraph 状态图的全局 State，使用 Annotation.Root 声明各字段
 */

import { Annotation } from "@langchain/langgraph";

/**
 * 整个 Multi-Agent 图的共享状态定义
 *
 * - task:            用户输入的任务描述
 * - researchReport:  ResearchAgent 产出的分析报告
 * - generatedCode:   CodeAgent 产出的 TypeScript 代码
 * - reviewResult:    ReviewAgent 的审核结论（APPROVED / REJECTED / 空字符串）
 * - reviewComments:  ReviewAgent 的审核意见
 * - retryCount:      已重试次数（用于限制最大重试）
 * - finalOutput:     最终输出内容（整合后呈现给用户）
 */
export const GraphState = Annotation.Root({
  task: Annotation<string>(),
  researchReport: Annotation<string>({
    default: () => "",
    reducer: (_prev, next) => next,
  }),
  generatedCode: Annotation<string>({
    default: () => "",
    reducer: (_prev, next) => next,
  }),
  reviewResult: Annotation<"APPROVED" | "REJECTED" | "">({
    default: () => "",
    reducer: (_prev, next) => next,
  }),
  reviewComments: Annotation<string>({
    default: () => "",
    reducer: (_prev, next) => next,
  }),
  retryCount: Annotation<number>({
    default: () => 0,
    reducer: (_prev, next) => next,
  }),
  finalOutput: Annotation<string>({
    default: () => "",
    reducer: (_prev, next) => next,
  }),
});

/** 导出 State 类型，方便各节点使用 */
export type GraphStateType = typeof GraphState.State;
