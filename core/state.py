# core/state.py
# 状态机定义
#
# 合法状态转换图：
#
#   ┌────────┐  plan   ┌──────────┐  execute  ┌───────────┐
#   │  idle  │ ──────► │ planning │ ─────────► │ executing │
#   └────────┘         └──────────┘            └───────────┘
#                                                    │
#                                                 review
#                                                    │
#                                                    ▼
#                                           ┌──────────────┐  finish  ┌──────┐
#                                           │  reviewing   │ ────────► │ done │
#                                           └──────────────┘           └──────┘

from enum import Enum
from typing import List


class State(str, Enum):
    """系统状态枚举（五态）"""
    IDLE      = "idle"
    PLANNING  = "planning"
    EXECUTING = "executing"
    REVIEWING = "reviewing"
    DONE      = "done"


# 合法转换表：{ 当前状态: [可到达的状态列表] }
_TRANSITIONS: dict = {
    State.IDLE      : [State.PLANNING],
    State.PLANNING  : [State.EXECUTING],
    State.EXECUTING : [State.REVIEWING],
    State.REVIEWING : [State.DONE],
    State.DONE      : [],          # 终态
}


class StateMachine:
    """
    简单有限状态机（FSM）。

    线性流转，不允许跳级或回退：
        idle → planning → executing → reviewing → done

    使用示例：
        sm = StateMachine()
        sm.transition(State.PLANNING)    # ✅ idle → planning
        sm.transition(State.EXECUTING)   # ✅ planning → executing
        sm.transition(State.DONE)        # ❌ ValueError（跳级）
    """

    def __init__(self, initial: State = State.IDLE) -> None:
        self._state: State = initial

    # ── 属性 ────────────────────────────────────────────────────────────

    @property
    def state(self) -> State:
        """当前状态（只读）"""
        return self._state

    # ── 查询 ────────────────────────────────────────────────────────────

    def can_transition(self, target: State) -> bool:
        """判断能否转换到 target 状态"""
        return target in _TRANSITIONS.get(self._state, [])

    def allowed_next(self) -> List[State]:
        """返回当前状态下所有合法的下一状态"""
        return _TRANSITIONS.get(self._state, [])

    # ── 转换 ────────────────────────────────────────────────────────────

    def transition(self, target: State) -> "StateMachine":
        """
        执行状态转换，返回 self 以支持链式调用。

        Raises:
            ValueError: 目标状态不在合法转换列表中。
        """
        if not self.can_transition(target):
            allowed = [s.value for s in self.allowed_next()]
            raise ValueError(
                f"非法状态转换：{self._state.value!r} ─► {target.value!r}。"
                f"当前允许：{allowed or ['（终态，无法转换）']}"
            )
        self._state = target
        return self

    def __repr__(self) -> str:
        return f"StateMachine(state={self._state.value!r})"
