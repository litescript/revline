from pydantic import BaseModel


class StatsOut(BaseModel):
    open_ros: int
    completed_today: int
    loaners_out: int
    parts_on_order: int
