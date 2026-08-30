import os
from datetime import datetime
from django.utils import timezone
from strands import Agent
from strands.models.gemini import GeminiModel
from .schemas import TodoBreakdownResponseSchema


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


def generate_subtask_proposals(
    title: str,
    description: str,
    created_at: datetime,
) -> TodoBreakdownResponseSchema:
    """親 Todo からサブタスク案を生成する。"""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY が設定されていません。")

    local_created_at = timezone.localtime(created_at)
    formatted_created_at = local_created_at.strftime("%Y年%m月%d日 %H:%M")

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
            "サブタスクの説明文には「〜です、ます」調は使わないでください。"
            "【出力時の注意事項】\n"
            "1. 親タスクの詳細説明中に完了時期や期限に関する情報（例: 明日まで、3日後、X月Y日まで 等）が含まれる場合は、「作成日時」を基準にして各サブタスクの仮の目標期日やスケジュールを検討し、サブタスクの説明文中にその情報を含めてください。\n"
            "2. 明確な期限表現がない場合でも、作成日時を起点とした実現可能なスケジュール感を仮で設定してください。\n"
            "3. サブタスクの説明文には「〜です、ます」調を使わず、簡潔な体言止めまたは断定調で記述してください。"
        ),
        callback_handler=None,
    )

    prompt = f"""
以下の親タスクを分析し、サブタスクに分解してください。

【親タスク】
タイトル: {title}
詳細説明: {description}
作成日時: {formatted_created_at} (JST)
"""

    print("エージェントがタスク分解を開始...")

    response = agent(
        prompt=prompt,
        structured_output_model=TodoBreakdownResponseSchema,
    )

    return response.structured_output
