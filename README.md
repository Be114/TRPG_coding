# TRPG Web Editor

TRPGゲームマスター向けの統合Webエディタアプリケーションです。シナリオ執筆、マップ作成、セッション管理を一つのプラットフォームで行えます。

## 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **スタイリング**: Tailwind CSS + shadcn/ui
- **状態管理**: Zustand
- **ルーティング**: React Router v6
- **認証**: Supabase Auth
- **データベース**: Supabase (PostgreSQL)
- **ファイルストレージ**: Supabase Storage

## 機能

### 実装済み
- ✅ プロジェクト基盤（Vite + React + TypeScript）
- ✅ Tailwind CSS + shadcn/ui セットアップ
- ✅ Supabase クライアント設定
- ✅ 基本ルーティング構造
- ✅ 認証システム（サインアップ/ログイン）
- ✅ 認証状態管理
- ✅ プロテクトルート
- ✅ ダッシュボード（プロジェクト一覧）
- ✅ プロジェクト作成/削除
- ✅ ダークモード対応

### 開発予定
- 🚧 シナリオエディタ（TipTapベース）
- 🚧 マップエディタ（Konva.jsベース）
- 🚧 自動保存機能
- 🚧 プロジェクト共有機能

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの設定

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. 以下のテーブルを作成（SQL Editor で実行）:

```sql
-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT
);

-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  thumbnail_url TEXT
);

-- Scenarios table
CREATE TABLE scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER DEFAULT 0
);

-- Maps table
CREATE TABLE maps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  thumbnail_url TEXT
);
```

3. Row Level Security (RLS) の設定:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Scenarios policies
CREATE POLICY "Users can view scenarios in own projects" ON scenarios
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = scenarios.project_id AND projects.user_id = auth.uid()
  ));
CREATE POLICY "Users can create scenarios in own projects" ON scenarios
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = scenarios.project_id AND projects.user_id = auth.uid()
  ));
CREATE POLICY "Users can update scenarios in own projects" ON scenarios
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = scenarios.project_id AND projects.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete scenarios in own projects" ON scenarios
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = scenarios.project_id AND projects.user_id = auth.uid()
  ));

-- Maps policies (same pattern as scenarios)
CREATE POLICY "Users can view maps in own projects" ON maps
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = maps.project_id AND projects.user_id = auth.uid()
  ));
CREATE POLICY "Users can create maps in own projects" ON maps
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = maps.project_id AND projects.user_id = auth.uid()
  ));
CREATE POLICY "Users can update maps in own projects" ON maps
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = maps.project_id AND projects.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete maps in own projects" ON maps
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = maps.project_id AND projects.user_id = auth.uid()
  ));
```

### 3. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、Supabaseの設定を追加:

```bash
cp .env.example .env
```

`.env` ファイルを編集:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

## プロジェクト構造

```
src/
├── components/          # 再利用可能なUIコンポーネント
│   ├── ui/             # shadcn/ui コンポーネント
│   ├── CreateProjectDialog.tsx
│   ├── ProjectCard.tsx
│   ├── ProtectedRoute.tsx
│   ├── ThemeProvider.tsx
│   └── ThemeToggle.tsx
├── pages/              # ページコンポーネント
│   ├── DashboardPage.tsx
│   ├── LoginPage.tsx
│   ├── SignUpPage.tsx
│   ├── ScenarioEditorPage.tsx
│   └── MapEditorPage.tsx
├── stores/             # Zustandストア
│   ├── authStore.ts
│   └── projectStore.ts
├── types/              # TypeScript型定義
│   ├── database.ts
│   └── index.ts
├── lib/                # ユーティリティ関数
│   ├── supabase.ts
│   └── utils.ts
├── App.tsx
├── main.tsx
└── index.css
```

## 開発ガイドライン

### コード品質
- TypeScriptの厳格な型定義を使用
- コンポーネントの適切な分割
- カスタムフックによるロジックの再利用
- エラーハンドリングの実装

### UI/UX
- レスポンシブデザイン（モバイル対応）
- ダークモード対応
- ローディング状態の表示
- エラーメッセージの適切な表示
- アクセシビリティの考慮

### パフォーマンス
- 遅延ローディングの実装
- 画像の最適化
- デバウンスされた自動保存
- 効率的な状態管理

## ライセンス

MIT License