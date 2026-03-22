# core/__init__.py
# 核心模块：消息、状态机、消息总线

from .message import Message, MessageType
from .state import StateMachine, State
from .bus import MessageBus

__all__ = ["Message", "MessageType", "StateMachine", "State", "MessageBus"]
