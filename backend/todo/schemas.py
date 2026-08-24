from datetime import datetime
from ninja import Schema, Field


class HealthCheckSchema(Schema):
    status: str


class TodoSchema(Schema):
    id: int
    parent_id: int | None = None
    title: str
    description: str
    is_done: bool
    created_at: datetime


class TodoCreateSchema(Schema):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""


class TodoUpdateSchema(Schema):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    is_done: bool | None = None


class SubtaskProposalSchema(Schema):
    title: str = Field(..., description="サブタスクのタイトル")
    description: str = Field("", description="サブタスクの補足説明")


class TodoBreakdownResponseSchema(Schema):
    subtasks: list[SubtaskProposalSchema] = Field(..., description="サブタスクのリスト")
