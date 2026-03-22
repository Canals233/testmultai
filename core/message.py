# core/message.py
# 消息格式定义
#
# 消息结构（符合规范）：
# {
#   "id":      str   - UUID，全局唯一标识
#   "from":    str   - 发送方 agent_id
#   "to":      str   - 接收方 agent_id 或 "broadcast"
#   "type":    str   - "task" | "result" | "status"
#   "payload": dict  - 消息内容（自由 key-value）
#   "ts":      float - UNIX 时间戳（秒）
# }

import uuid
import time
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Dict


class MessageType(str, Enum):
    """消息类型枚举"""
    TASK   = "task"    # 任务分发：Orchestrator → SubAgent
    RESULT = "result"  # 结果回传：SubAgent → Orchestrator
    STATUS = "status"  # 状态通知：任意 → 任意


@dataclass
class Message:
    """
    标准消息对象。

    由于 Python dataclass 不允许字段名为 "from"（保留字），
    内部使用 from_agent，序列化时还原为 "from"。

    Attributes:
        from_agent : 发送方 agent_id
        to         : 接收方 agent_id 或 "broadcast"
        type       : 消息类型（MessageType）
        payload    : 消息体，任意 key-value
        id         : 自动生成的 UUID 字符串
        ts         : 自动生成的 UNIX 时间戳
    """
    from_agent : str
    to         : str
    type       : MessageType
    payload    : Dict[str, Any] = field(default_factory=dict)
    id         : str            = field(default_factory=lambda: str(uuid.uuid4()))
    ts         : float          = field(default_factory=time.time)

    def to_dict(self) -> dict:
        """序列化为符合规范的原始字典（from_agent → from）"""
        d = asdict(self)
        d["from"] = d.pop("from_agent")
        d["type"] = self.type.value
        return d

    def __repr__(self) -> str:
        return (
            f"Message(id={self.id[:8]}… "
            f"from={self.from_agent!r} to={self.to!r} "
            f"type={self.type.value!r})"
        )
