import os
import environ
from pydantic import BaseModel, Field
from strands import Agent
from strands.models.gemini import GeminiModel

env = environ.Env()

environ.Env.read_env(os.path.join(os.path.dirname(__file__), ".env"))

GEMINI_API_KEY = env("GEMINI_API_KEY")


class SubTaskProposal(BaseModel):
    """分解されたサブタスクの1要素"""

    title: str = Field(description="具体的に実行可能なサブタスクのタイトル")
    description: str = Field(description="サブタスクの補足説明や手順の概要", default="")


class TaskBreakdownResponse(BaseModel):
    """分解したサブタスク全体"""

    subtasks: list[SubTaskProposal] = Field(description="2~5個のサブタスク提案リスト")


def generate_subtask_proposals(
    parent_title: str, parent_description: str = ""
) -> list[SubTaskProposal]:
    """サブタスク生成関数。
    親タスクから3~5個のサブタスクを生成する。
    Web アプリ (Django) の API から呼び出すことを想定し、副作用 (DB書き込み) は持たせず
    Pydantic のオブジェクトリストを返す純粋関数として実装。
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY が設定されていません。")

    model = GeminiModel(
        client_args={"api_key": GEMINI_API_KEY},
        model_id="gemini-3.5-flash",
    )

    agent = Agent(
        model=model,
        system_prompt=(
            "あなたは優秀なタスク管理アシスタントです。"
            "ユーザーから与えられた親タスクを分析し、達成するために実行可能な2個以上5個以下の具体的なサブタスクに分解してください。"
            "親タスクの説明文中に、完了時期や期限に関する情報が含まれる場合は、その時期や期限も考慮のうえでサブタスクを検討し、サブタスクの説明文中にそのサブタスク自体の時期や期限の情報を含めてください。"
            "サブタスクの説明文は「〜です、ます」調は使わないでください。"
        ),
        callback_handler=None,
    )

    prompt = f"""
以下の親タスクを分析し、サブタスクに分解してください。

【親タスク】
タイトル: {parent_title}
詳細説明: {parent_description}
"""

    print("エージェントがタスク分解を開始...")

    response = agent(
        prompt=prompt,
        structured_output_model=TaskBreakdownResponse,
    )

    return response.structured_output.subtasks


if __name__ == "__main__":
    test_title = "Django アプリを AWS にデプロイする"
    test_desc = "Django Ninja (バックエンド) と React (フロントエンド) で作成した Todo アプリを AWS 上にデプロイする。バックエンドはコンテナ化して ECS 上で動かす。2週間後のデプロイを目標にする。"

    try:
        proposals = generate_subtask_proposals(test_title, test_desc)

        print("\n サブタスクの分解に成功")
        print("-" * 50)
        for i, task in enumerate(proposals, 1):
            print(f"# {i}. {task.title}")
            print(f"{task.description}")
        print("-" * 50)

    except Exception as e:
        print(f"\n エラー発生: {e}")
