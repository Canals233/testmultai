/**
 * @file index.ts
 * @description LangGraph.js Multi-Agent Demo 入口
 *
 * 演示完整的 Research → Code → Review 工作流：
 * 1. 调用 graph.stream() 流式观察状态变化
 * 2. 调用 graph.invoke() 获取最终结果
 * 3. 格式化输出最终代码和审查结果
 */

import { graph } from "./graph/graph.js";

/**
 * 主函数：运行 Multi-Agent 工作流
 */
async function main(): Promise<void> {
  const task = "实现一个 TypeScript 二分查找函数";

  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║     LangGraph.js Multi-Agent Demo (TypeScript)        ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  console.log(`\n🚀 任务: "${task}"\n`);
  console.log("─────────────────────────────────────────────────────────");

  try {
    // 第一轮：使用 stream 逐步观察状态变化
    console.log("\n📡 使用 stream 模式运行，观察状态变化...\n");

    const stream = await graph.stream(
      { task },
      { streamMode: "updates" }
    );

    let stepCount = 0;
    for await (const update of stream) {
      stepCount++;
      // update 是一个 Record<nodeName, partialState>
      const entries = Object.entries(update as Record<string, Record<string, unknown>>);
      for (const [nodeName, nodeOutput] of entries) {
        console.log(`\n[Step ${stepCount}] 节点 "${nodeName}" 完成`);

        if (typeof nodeOutput.researchReport === "string") {
          console.log("  📋 researchReport 长度:", nodeOutput.researchReport.length, "字符");
        }
        if (typeof nodeOutput.generatedCode === "string") {
          console.log("  💻 generatedCode 长度:", nodeOutput.generatedCode.length, "字符");
        }
        if (nodeOutput.reviewResult) {
          console.log("  🔎 reviewResult:", nodeOutput.reviewResult);
        }
        if (typeof nodeOutput.retryCount === "number") {
          console.log("  🔄 retryCount:", nodeOutput.retryCount);
        }
      }
    }

    // 第二轮：invoke 获取完整最终状态
    console.log("\n─────────────────────────────────────────────────────────");
    console.log("✅ stream 完成，再次 invoke 获取完整最终状态...");

    const finalState = await graph.invoke({ task });

    console.log("\n" + finalState.finalOutput);

  } catch (err) {
    console.error("\n❌ 执行出错:", err);
  }
}

// 运行主函数
main();
