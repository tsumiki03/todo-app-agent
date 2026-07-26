from ninja import NinjaAPI
from todo.api import router as todo_router

api = NinjaAPI()

api.add_router("/todo/", todo_router)
