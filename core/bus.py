# core/bus.py
# 消息总线（基于内存队列）
#
# 架构示意：
#
#   Agent-A                   MessageBus                   Agent-B
#     │                           │                           │
#     │  bus.publish(msg)         │                           │
#     │ ─────────────────────────►│  _queues["B"].put(msg)    │
#     │                           │ ─────────────────────────►│
#     │                           │                           │
#     │                           │    bus.consume("B")       │
#     │                           │◄──────────────────────────│
#     │                           │  yield msg                │
#     │                           │──────────────────────────►│
#
# 广播（to="broadcast"）：
#   消息被复制并投递到所有注册 Agent 的队列（发送方自身除外）

import queue
from typing import Dict, Iterator, List

from .message import Message


BROADCAST = "broadcast"


class MessageBus:
    """
    基于 queue.Queue 的内存消息总线。

    - 每个 Agent 注册后拥有一个专属的先进先出队列
    - publish()  ：按 msg.to 路由（点对点 / 广播）
    - consume()  ：非阻塞地取出队列中全部待处理消息
    - peek_size()：查看队列积压数量
    """

    def __init__(self) -> None:
        # { agent_id: queue.Queue[Message] }
        self._queues: Dict[str, queue.Queue] = {}

    # ── 注册 ────────────────────────────────────────────────────────────

    def register(self, agent_id: str) -> None:
        """注册 Agent，首次注册时创建空队列；重复注册无副作用。"""
        if agent_id not in self._queues:
            self._queues[agent_id] = queue.Queue()

    def unregister(self, agent_id: str) -> None:
        """注销 Agent，丢弃其队列中的剩余消息。"""
        self._queues.pop(agent_id, None)

    @property
    def agents(self) -> List[str]:
        """已注册的所有 Agent ID"""
        return list(self._queues.keys())

    # ── 发布 / 消费 ─────────────────────────────────────────────────────

    def publish(self, msg: Message) -> int:
        """
        发布消息。

        Args:
            msg: 待发送的 Message 对象

        Returns:
            实际投递的队列数（广播 = 所有已注册 Agent 数 - 1；点对点 = 1）

        Raises:
            KeyError: 目标 Agent 未注册（点对点模式）
        """
        if msg.to == BROADCAST:
            count = 0
            for aid, q in self._queues.items():
                if aid != msg.from_agent:   # 不回传给发送方
                    q.put(msg)
                    count += 1
            return count

        target_q = self._queues.get(msg.to)
        if target_q is None:
            raise KeyError(
                f"MessageBus: 目标 Agent {msg.to!r} 未注册。"
                f"已注册列表：{self.agents}"
            )
        target_q.put(msg)
        return 1

    def consume(self, agent_id: str) -> Iterator[Message]:
        """
        非阻塞地取出指定 Agent 队列中的所有待处理消息（先进先出）。

        Yields:
            Message 对象
        """
        q = self._queues.get(agent_id)
        if q is None:
            return
        while True:
            try:
                yield q.get_nowait()
            except queue.Empty:
                break

    def peek_size(self, agent_id: str) -> int:
        """返回 Agent 队列中当前消息数量（不消费）。"""
        q = self._queues.get(agent_id)
        return q.qsize() if q else 0

    def __repr__(self) -> str:
        sizes = {aid: q.qsize() for aid, q in self._queues.items()}
        return f"MessageBus(queues={sizes})"
