from ninja import Router
from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import Todo
from .schemas import (
    HealthCheckSchema,
    SubtaskBatchCreateSchema,
    TodoSchema,
    TodoCreateSchema,
    TodoUpdateSchema,
    TodoBreakdownResponseSchema,
)
from .services import generate_subtask_proposals

router = Router()


@router.get("/health", response=HealthCheckSchema)
def health_check(request):
    return {"status": "ok"}


@router.get("/", response=list[TodoSchema])
def get_todos(request):
    return list(Todo.objects.all().order_by("-created_at"))


@router.post("/", response=TodoSchema)
def create_todo(request, data: TodoCreateSchema):
    todo = Todo.objects.create(**data.dict())
    return todo


@router.put("/{todo_id}", response=TodoSchema)
def update_todo(request, todo_id: int, data: TodoUpdateSchema):
    todo = get_object_or_404(Todo, id=todo_id)
    update_data = data.dict(exclude_unset=True)
    for attr, value in update_data.items():
        setattr(todo, attr, value)
    todo.save()
    return todo


@router.delete("/{todo_id}")
def delete_todo(request, todo_id: int):
    todo = get_object_or_404(Todo, id=todo_id)
    todo.delete()
    return {"success": True}


@router.post("/{todo_id}/breakdown", response=TodoBreakdownResponseSchema)
def breakdown_todo(request, todo_id: int):
    """指定された Todo を AI でサブタスクに分解し、提案リストを返す。"""
    todo = get_object_or_404(Todo, id=todo_id)

    result = generate_subtask_proposals(
        title=todo.title,
        description=todo.description,
        created_at=todo.created_at,
    )

    return result


@router.post("/{todo_id}/subtasks", response=list[TodoSchema])
def create_subtasks_batch(request, todo_id: int, payload: SubtaskBatchCreateSchema):
    """指定された親 Todo (todo_id) に対して、サブタスク群を一括登録する。"""
    parent_todo = get_object_or_404(Todo, id=todo_id)

    new_subtasks = [
        Todo(
            parent=parent_todo,
            user_id=parent_todo.user_id,
            title=item.title,
            description=item.description,
            is_done=False,
        )
        for item in payload.subtasks
    ]

    with transaction.atomic():
        created_subtasks = Todo.objects.bulk_create(new_subtasks)

    return created_subtasks
