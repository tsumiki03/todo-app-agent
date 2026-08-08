# todo-app-agent
AIエージェント機能付き (予定) Todoアプリ (Django Ninja + Vite + Mantine)

## ローカル開発手順
### 1. バックエンドの開発サーバ起動
- `backend` ディレクトリに移動
``` bash
cd backend
```
- 開発サーバ起動
``` bash
uv run python manage.py runserver
```
### 2. フロントエンドの開発サーバ起動
- `frontend` ディレクトリに移動
``` bash
cd frontend
```
- 開発サーバ起動
``` bash
pnpm dev
```
- (備考) `.env.development` の `VITE_ENABLE_MOCK` を `true` に設定するとフロントエンド側でモックAPIが有効化される。この状態の場合はバックエンドの開発サーバ起動の必要はない。
