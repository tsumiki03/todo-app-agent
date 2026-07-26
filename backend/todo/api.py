from ninja import Router
from .models import Todo
from .schemas import HealthCheckSchema, TodoSchema, TodoCreateSchema, TodoUpdateSchema
from django.shortcuts import get_object_or_404

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
