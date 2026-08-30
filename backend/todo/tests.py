from django.test import TestCase
from ninja.testing import TestClient
from .api import router
from .models import Todo

# Create your tests here.


class HealthCheckTest(TestCase):
    def setUp(self):
        self.ninja_client = TestClient(router)

    def test_health(self):
        response = self.ninja_client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})


class TodoGetApiTests(TestCase):
    def setUp(self):
        self.ninja_client = TestClient(router)

    def test_get_todos_empty(self):
        """データが0件の場合空のリストが返ること"""
        response = self.ninja_client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_get_todos_single(self):
        """データが1件のみ存在する場合正しい構造で返ること"""
        todo = Todo.objects.create(
            user_id="mock-user-123", title="テストタスク", description="テスト説明"
        )

        response = self.ninja_client.get("/")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], todo.id)
        self.assertEqual(data[0]["title"], "テストタスク")
        self.assertEqual(data[0]["description"], "テスト説明")
        self.assertFalse(data[0]["is_done"])
        self.assertIn("created_at", data[0])

    def test_get_todos_ordering(self):
        """データが複数件ある場合、作成日時 (created_at) の降順で並んでいること"""
        todo_old = Todo.objects.create(user_id="mock-user-123", title="古いタスク")
        todo_new = Todo.objects.create(user_id="mock-user-123", title="新しいタスク")

        response = self.ninja_client.get("/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["id"], todo_new.id)
        self.assertEqual(data[1]["id"], todo_old.id)


class TodoPostApiTests(TestCase):
    def setUp(self):
        self.ninja_client = TestClient(router)

    def test_success_create_todo(self):
        """正しいタイトルと説明文を送ると、DBに1件増えて、正しい構造の TodoSchema が返ること"""
        payload = {"title": "テストタスク", "description": "テスト説明"}
        response = self.ninja_client.post("/", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(Todo.objects.count(), 1)
        created_todo = Todo.objects.first()
        self.assertEqual(data["id"], created_todo.id)
        self.assertEqual(data["title"], "テストタスク")
        self.assertEqual(data["description"], "テスト説明")
        self.assertFalse(data["is_done"])
        self.assertIn("created_at", data)

    def test_fail_create_todo_title_empty(self):
        """タイトルが空の状態で送ると422エラーが返り、DBにデータが登録されないこと"""
        payload = {"title": "", "description": "タイトルが空のテスト"}
        response = self.ninja_client.post("/", json=payload)

        self.assertEqual(response.status_code, 422)
        self.assertEqual(Todo.objects.count(), 0)

    def test_fail_create_todo_long_title(self):
        """タイトルが200文字より長いと422エラーが返り、DBにデータが登録されないこと"""
        long_title = "a" * 201
        payload = {"title": long_title, "description": "タイトルが長過ぎるテスト"}
        response = self.ninja_client.post("/", json=payload)

        self.assertEqual(response.status_code, 422)
        self.assertEqual(Todo.objects.count(), 0)

    def test_success_create_todo_max_length_title(self):
        """タイトルが200文字 (上限ちょうど) だとDBに1件増えて、正しい構造の TodoSchema が返ること"""
        max_length_title = "a" * 200
        payload = {
            "title": max_length_title,
            "description": "タイトル長が上限ちょうどのテスト",
        }
        response = self.ninja_client.post("/", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(Todo.objects.count(), 1)
        created_todo = Todo.objects.first()
        self.assertEqual(data["id"], created_todo.id)
        self.assertEqual(data["title"], max_length_title)
        self.assertEqual(data["description"], "タイトル長が上限ちょうどのテスト")
        self.assertFalse(data["is_done"])
        self.assertIn("created_at", data)

    def test_success_create_todo_description_empty(self):
        """説明が空の状態で送っても登録が成功すること"""
        payload = {"title": "テストタスク", "description": ""}
        response = self.ninja_client.post("/", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(Todo.objects.count(), 1)
        created_todo = Todo.objects.first()
        self.assertEqual(data["id"], created_todo.id)
        self.assertEqual(data["title"], "テストタスク")
        self.assertEqual(data["description"], "")
        self.assertFalse(data["is_done"])
        self.assertIn("created_at", data)

    def test_success_create_todo_description_omitted(self):
        """descriptionが省略されていても登録が成功すること"""
        payload = {"title": "テストタスク"}
        response = self.ninja_client.post("/", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(Todo.objects.count(), 1)
        created_todo = Todo.objects.first()
        self.assertEqual(data["id"], created_todo.id)
        self.assertEqual(data["title"], "テストタスク")
        self.assertEqual(data["description"], "")
        self.assertFalse(data["is_done"])
        self.assertIn("created_at", data)


class TodoPutApiTests(TestCase):
    def setUp(self):
        self.ninja_client = TestClient(router)
        self.todo = Todo.objects.create(
            user_id="mock-user-123", title="テストタスク", description="テスト説明"
        )

    def test_success_update_todo(self):
        """全フィールドを変更する場合、問題なく変更できること"""
        payload = {
            "title": "修正テストタスク",
            "description": "修正テスト説明",
            "is_done": True,
        }
        response = self.ninja_client.put(f"/{self.todo.id}", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(Todo.objects.count(), 1)
        updated_todo = Todo.objects.first()

        self.assertEqual(self.todo.id, data["id"])
        self.assertEqual(data["id"], updated_todo.id)

        self.assertEqual(data["title"], payload["title"])
        self.assertEqual(data["description"], payload["description"])
        self.assertTrue(data["is_done"])

        self.assertEqual(updated_todo.created_at, self.todo.created_at)
        self.assertEqual(updated_todo.title, payload["title"])
        self.assertEqual(updated_todo.description, payload["description"])
        self.assertTrue(data["is_done"])

    def test_success_update_todo_empty_json(self):
        """空のJSONを送った場合、元のデータが変更されないこと"""
        payload = {}
        response = self.ninja_client.put(f"/{self.todo.id}", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(Todo.objects.count(), 1)
        updated_todo = Todo.objects.first()
        self.assertEqual(self.todo.id, data["id"])
        self.assertEqual(data["id"], updated_todo.id)

        self.assertEqual(data["title"], "テストタスク")
        self.assertEqual(data["description"], "テスト説明")
        self.assertFalse(data["is_done"])

        self.assertEqual(updated_todo.created_at, self.todo.created_at)
        self.assertEqual(updated_todo.title, "テストタスク")
        self.assertEqual(updated_todo.description, "テスト説明")
        self.assertFalse(updated_todo.is_done)

    def test_success_update_todo_is_done_only(self):
        """is_done のみを変更した場合、他のフィールドは変更されないこと"""
        payload = {"is_done": True}
        response = self.ninja_client.put(f"/{self.todo.id}", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(Todo.objects.count(), 1)
        updated_todo = Todo.objects.first()
        self.assertEqual(self.todo.id, data["id"])
        self.assertEqual(data["id"], updated_todo.id)

        self.assertEqual(data["title"], "テストタスク")
        self.assertEqual(data["description"], "テスト説明")
        self.assertTrue(data["is_done"])

        self.assertEqual(updated_todo.created_at, self.todo.created_at)
        self.assertEqual(updated_todo.title, "テストタスク")
        self.assertEqual(updated_todo.description, "テスト説明")
        self.assertTrue(updated_todo.is_done)

    def test_success_update_todo_title_max_length(self):
        """タイトルが最大長さちょうどの場合、変更が成功すること"""
        long_title = "a" * 200
        payload = {"title": long_title}
        response = self.ninja_client.put(f"/{self.todo.id}", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(Todo.objects.count(), 1)
        updated_todo = Todo.objects.first()
        self.assertEqual(self.todo.id, data["id"])
        self.assertEqual(data["id"], updated_todo.id)

        self.assertEqual(data["title"], long_title)
        self.assertEqual(data["description"], "テスト説明")
        self.assertFalse(data["is_done"])

        self.assertEqual(updated_todo.created_at, self.todo.created_at)
        self.assertEqual(updated_todo.title, long_title)
        self.assertEqual(updated_todo.description, "テスト説明")
        self.assertFalse(updated_todo.is_done)

    def test_fail_update_todo_title_empty(self):
        """タイトルが空文字で送った場合、422エラーが返り元のデータは変更されないこと"""
        payload = {"title": "", "description": "修正テスト説明", "is_done": True}
        response = self.ninja_client.put(f"/{self.todo.id}", json=payload)

        self.assertEqual(response.status_code, 422)
        self.assertEqual(Todo.objects.count(), 1)
        todo = Todo.objects.first()

        self.assertEqual(todo.id, self.todo.id)
        self.assertEqual(todo.created_at, self.todo.created_at)
        self.assertEqual(todo.title, "テストタスク")
        self.assertEqual(todo.description, "テスト説明")
        self.assertFalse(todo.is_done)

    def test_fail_update_todo_long_title(self):
        """タイトルが最大長さよりも長い場合、422エラーが返り元のデータは変更されないこと"""
        long_title = "a" * 201
        payload = {
            "title": long_title,
            "description": "修正テスト説明",
            "is_done": True,
        }
        response = self.ninja_client.put(f"/{self.todo.id}", json=payload)

        self.assertEqual(response.status_code, 422)
        self.assertEqual(Todo.objects.count(), 1)
        todo = Todo.objects.first()

        self.assertEqual(todo.id, self.todo.id)
        self.assertEqual(todo.created_at, self.todo.created_at)
        self.assertEqual(todo.title, "テストタスク")
        self.assertEqual(todo.description, "テスト説明")
        self.assertFalse(todo.is_done)

    def test_fail_update_todo_id_not_exist(self):
        """指定したIDのデータが存在しない場合、404エラーが返り元のデータは変更されないこと"""
        id_not_exist = 999
        payload = {
            "title": "修正テストタスク",
            "description": "修正テスト説明",
            "is_done": True,
        }
        response = self.ninja_client.put(f"/{id_not_exist}", json=payload)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(Todo.objects.count(), 1)
        todo = Todo.objects.first()

        self.assertEqual(todo.id, self.todo.id)
        self.assertEqual(todo.created_at, self.todo.created_at)
        self.assertEqual(todo.title, "テストタスク")
        self.assertEqual(todo.description, "テスト説明")
        self.assertFalse(todo.is_done)


class TodoDeleteApiTests(TestCase):
    def setUp(self):
        self.ninja_client = TestClient(router)
        self.todo = Todo.objects.create(
            user_id="mock-user-123", title="テストタスク", description="テスト説明"
        )

    def test_success_delete_todo(self):
        """存在するIDを指定した場合、そのデータのみ削除され、既存のデータに影響がないこと"""
        other_todo = Todo.objects.create(title="別のタスク")
        response = self.ninja_client.delete(f"/{self.todo.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"success": True})

        self.assertFalse(Todo.objects.filter(id=self.todo.id).exists())

        self.assertEqual(Todo.objects.count(), 1)
        todo = Todo.objects.first()
        self.assertEqual(todo.id, other_todo.id)
        self.assertEqual(todo.created_at, other_todo.created_at)
        self.assertEqual(todo.title, other_todo.title)
        self.assertEqual(todo.description, other_todo.description)
        self.assertEqual(todo.is_done, other_todo.is_done)

    def test_fail_delete_todo_not_exist(self):
        """存在しないIDを指定した場合、404 エラーが返り、既存のデータに影響がないこと"""
        id_not_exist = 999
        response = self.ninja_client.delete(f"/{id_not_exist}")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(Todo.objects.count(), 1)
        todo = Todo.objects.first()

        self.assertEqual(todo.id, self.todo.id)
        self.assertEqual(todo.created_at, self.todo.created_at)
        self.assertEqual(todo.title, "テストタスク")
        self.assertEqual(todo.description, "テスト説明")
        self.assertFalse(todo.is_done)


class SubtaskBatchPostApiTests(TestCase):
    def setUp(self):
        self.ninja_client = TestClient(router)
        self.parent_todo = Todo.objects.create(
            title="親タスク",
            description="親タスクの説明文",
            user_id="user_123",
        )

    def test_success_create_subtasks_batch(self):
        """正しいサブタスク配列を送ると、DBに親タスクに紐づくサブタスクが増え、正しいレスポンスが返ること"""
        payload = {
            "subtasks": [
                {"title": "サブタスク1", "description": "説明1"},
                {"title": "サブタスク2", "description": "説明2"},
            ]
        }
        url = f"/{self.parent_todo.id}/subtasks"
        response = self.ninja_client.post(url, json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()

        # レスポンスがリスト型であること
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 2)

        # 全体で 3 件（親1件 + サブ2件）存在すること
        self.assertEqual(Todo.objects.count(), 3)

        # サブタスクが親 Todo (parent_id) および user_id を正しく保持して作成されていること
        subtasks = Todo.objects.filter(parent=self.parent_todo)
        self.assertEqual(subtasks.count(), 2)

        first_subtask = subtasks.first()
        self.assertEqual(data[0]["id"], first_subtask.id)
        self.assertEqual(data[0]["parent_id"], self.parent_todo.id)
        self.assertEqual(data[0]["title"], "サブタスク1")
        self.assertEqual(data[0]["description"], "説明1")
        self.assertEqual(
            first_subtask.user_id, "user_123"
        )  # 親の user_id が継承されていること

    def test_success_create_subtask_max_length_title(self):
        """サブタスクのタイトルが200文字（上限ちょうど）でも登録が成功すること"""
        max_length_title = "a" * 200
        payload = {
            "subtasks": [{"title": max_length_title, "description": "境界値テスト"}]
        }
        url = f"/{self.parent_todo.id}/subtasks"
        response = self.ninja_client.post(url, json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["title"], max_length_title)
        self.assertEqual(Todo.objects.filter(parent=self.parent_todo).count(), 1)

    def test_fail_create_subtasks_title_empty(self):
        """サブタスクのいずれかのタイトルが空文字の場合、422エラーとなり1件もDBに登録されないこと"""
        payload = {
            "subtasks": [
                {"title": "正常なサブタスク", "description": "OK"},
                {"title": "", "description": "NG（タイトル空文字）"},
            ]
        }
        url = f"/{self.parent_todo.id}/subtasks"
        response = self.ninja_client.post(url, json=payload)

        self.assertEqual(response.status_code, 422)
        # オール・オア・ナッシングでサブタスクは1件も増えないこと（親タスクの1件のみ）
        self.assertEqual(Todo.objects.count(), 1)

    def test_fail_create_subtasks_long_title(self):
        """サブタスクのタイトルが201文字（上限超過）の場合、422エラーとなり1件もDBに登録されないこと"""
        long_title = "a" * 201
        payload = {"subtasks": [{"title": long_title, "description": "タイトル長すぎ"}]}
        url = f"/{self.parent_todo.id}/subtasks"
        response = self.ninja_client.post(url, json=payload)

        self.assertEqual(response.status_code, 422)
        self.assertEqual(Todo.objects.count(), 1)

    def test_fail_create_subtasks_empty_array(self):
        """subtasks 配列が空（0件）の場合、422エラーが返り処理されないこと"""
        payload = {"subtasks": []}
        url = f"/{self.parent_todo.id}/subtasks"
        response = self.ninja_client.post(url, json=payload)

        self.assertEqual(response.status_code, 422)
        self.assertEqual(Todo.objects.count(), 1)

    def test_fail_create_subtasks_parent_not_found(self):
        """存在しない親 todo_id を指定した場合、404エラーが返ること"""
        invalid_parent_id = 999999
        payload = {"subtasks": [{"title": "サブタスク1", "description": "説明"}]}
        url = f"/{invalid_parent_id}/subtasks"
        response = self.ninja_client.post(url, json=payload)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(Todo.objects.count(), 1)


class TodoTreeGetApiTests(TestCase):
    def setUp(self):
        self.ninja_client = TestClient(router)

    def test_get_todo_tree_empty(self):
        """データが0件の場合空のリストが返ること"""
        response = self.ninja_client.get("/tree")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_get_todo_tree_single_without_subtasks(self):
        """サブタスクを持たない親タスクが1件のみ存在する場合、subtasksが空配列で返ること"""
        parent_todo = Todo.objects.create(
            user_id="mock-user-123", title="親タスクのみ", description="テスト説明"
        )

        response = self.ninja_client.get("/tree")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], parent_todo.id)
        self.assertEqual(data[0]["title"], "親タスクのみ")
        self.assertEqual(data[0]["description"], "テスト説明")
        self.assertFalse(data[0]["is_done"])
        self.assertIn("created_at", data[0])
        self.assertEqual(data[0]["subtasks"], [])

    def test_get_todo_tree_with_subtasks(self):
        """親タスクとサブタスクが存在する場合、サブタスクが親の中にネストされトップレベルには親のみ返ること"""
        parent_todo = Todo.objects.create(
            user_id="mock-user-123", title="親タスク", description="親の説明"
        )
        subtask1 = Todo.objects.create(
            user_id="mock-user-123",
            title="サブタスク1",
            description="サブ説明1",
            parent=parent_todo,
        )
        subtask2 = Todo.objects.create(
            user_id="mock-user-123",
            title="サブタスク2",
            description="サブ説明2",
            parent=parent_todo,
        )

        response = self.ninja_client.get("/tree")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        # トップレベルの件数は親タスクの 1 件のみであること
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], parent_todo.id)

        # subtasks フィールドに 2 件のサブタスクがネストされていること
        subtasks_data = data[0]["subtasks"]
        self.assertEqual(len(subtasks_data), 2)

        self.assertEqual(subtasks_data[0]["id"], subtask1.id)
        self.assertEqual(subtasks_data[0]["parent_id"], parent_todo.id)
        self.assertEqual(subtasks_data[0]["title"], "サブタスク1")
        self.assertEqual(subtasks_data[0]["description"], "サブ説明1")

        self.assertEqual(subtasks_data[1]["id"], subtask2.id)
        self.assertEqual(subtasks_data[1]["parent_id"], parent_todo.id)
        self.assertEqual(subtasks_data[1]["title"], "サブタスク2")

    def test_get_todo_tree_ordering(self):
        """複数件の親タスクが存在する場合、作成日時 (created_at) の降順で並んでいること"""
        parent_old = Todo.objects.create(user_id="mock-user-123", title="古い親タスク")
        parent_new = Todo.objects.create(
            user_id="mock-user-123", title="新しい親タスク"
        )

        # 古い親タスクにサブタスクを紐付け（親の並び順に影響がないことを確認）
        Todo.objects.create(
            user_id="mock-user-123", title="古い親のサブタスク", parent=parent_old
        )

        response = self.ninja_client.get("/tree")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        # トップレベルは作成日降順で新しい親タスクが先頭に来ること
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["id"], parent_new.id)
        self.assertEqual(data[1]["id"], parent_old.id)
        self.assertEqual(len(data[1]["subtasks"]), 1)
