# サークル機関誌 管理アプリ

サークルが毎年発行する機関誌を、オンラインで管理するためのWebアプリです。メンバーが原稿ファイルを投稿し、管理者がそれを冊子としてまとめ、メンバーが冊子を閲覧できます。年度をまたいで過去号を残します。

- フロント: **Next.js (App Router) + TypeScript + Tailwind CSS v4**
- 認証: **Firebase Authentication**(管理者のみGoogleサインイン。一般メンバーは匿名認証で自動識別しログイン画面を挟まない)
- データベース: **Cloud Firestore**
- ファイル保管: **Firebase Storage**

## できること

- 一般メンバーはログイン不要。初回に名簿から自分の名前を選ぶだけで、以降はそのブラウザで自動的に本人として扱われる(裏側ではFirebaseの匿名認証を使用)
- 管理者のみGoogleサインインが必要(`/login`)
- 年度ごとの号の一覧(受付中 / 編集中 / 公開)
- 号ごとの冊子ビューア・原稿投稿・名簿
- 投稿は1人1件まで。再投稿すると前回分と置き換わる
- 投稿時に「非公開にする」を選べる。非公開の投稿を元に管理者が冊子セクションを作ると、そのセクションは投稿者本人と管理者以外には冊子ビューアに表示されない
- 自分が今投稿しているファイルはいつでもダウンロードして確認できる(他のメンバーからは見えない)
- 管理者専用の画面(新年度号の作成、冊子セクションの追加・並び替え・削除、名簿の追加・編集、投稿された生ファイルのダウンロード)

権限の要点:

- 一般メンバー … 冊子の閲覧、自分のファイルの投稿、自分の名簿欄の記入ができる。他人の投稿生ファイルはダウンロードできない。
- 管理者 … 上記に加え、投稿された生ファイルのダウンロード、冊子セクションの追加・並び替え、新年度号の作成、名簿の作成・編集ができる。

管理者判定は画面上の出し分けだけでなく、`firestore.rules` / `storage.rules` によってサーバー側でも強制しています。一般メンバーの本人識別も、ログイン画面こそ無いものの、各ブラウザに割り当てられる匿名認証のUIDを使ってサーバー側(セキュリティルール)で検証しています。

## データモデル(Firestore)

「号 → その中の投稿・冊子・名簿」という入れ子構造です。

- `config/adminEmails` — 管理者メールアドレスの配列(`adminEmails`)
- `issues/{issueId}` — 号(`year` / `title` / `status`)
  - `submissions/{uid}` — メンバーがアップロードした生ファイル(ドキュメントIDを投稿者のuidに固定し、1人1件までに制限)
  - `booklet/{sectionId}` — 管理者が構成した、完成した冊子のセクション
  - `roster/{rosterId}` — 名簿(`name` / `grade` / `submitted` / `note` / `claimedByUid`)

投稿(submissions)と冊子(booklet)を分けて持つのがポイントです。メンバーが上げた生ファイルがそのまま冊子になるのではなく、管理者がダウンロード→PDF化→セクションとして追加する運用を想定しています。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Firebaseプロジェクトの用意

1. [Firebaseコンソール](https://console.firebase.google.com/) で新しいプロジェクトを作成する。
2. **Authentication** で「Google」と「匿名」の2つのサインイン方法を有効化する(Google=管理者用、匿名=一般メンバー用)。
3. **Firestore Database** と **Storage** を本番モードで作成する(サークル規模なら無料枠で収まります。Storageの利用にはBlazeプランへのアップグレードが必要ですが、無料枠内であれば課金されません)。
4. プロジェクトの設定 → 全般 → 「マイアプリ」からウェブアプリを追加し、表示される設定値を控える。

### 3. 環境変数

`.env.local.example` をコピーして `.env.local` を作成し、値を設定します。

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 4. 管理者の登録

Firestoreに管理者判定用のドキュメントを1件作成します。

- コレクション `config` / ドキュメントID `adminEmails`
- フィールド `adminEmails`(配列, string)に、管理者にしたいGoogleアカウントのメールアドレスを追加

### 5. セキュリティルールのデプロイ

[Firebase CLI](https://firebase.google.com/docs/cli) を使います。

```bash
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc   # projects.default を自分のプロジェクトIDに書き換える
firebase deploy --only firestore:rules,storage:rules
```

### 6. StorageのCORS設定

管理画面の「ダウンロード」は、ブラウザ内でファイルの中身を取得してから保存させる方式です(単純なリンクではPDFがそのまま開いてしまうため)。この方式ではStorageバケットにCORSの設定が必要です。リポジトリ直下の `cors.json` を使い、[Google Cloudコンソール](https://console.cloud.google.com/) 右上の Cloud Shell か、ローカルの gcloud CLI で一度だけ実行します。

```bash
gcloud storage buckets update gs://<バケット名> --cors-file=cors.json
```

バケット名は `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` の値(例: `your-project.firebasestorage.app`)です。Cloud Shellで実行する場合は、先に `cors.json` を同じ内容で作成してください。設定しないと、ダウンロード時に「ダウンロードに失敗しました」と表示されます(読み取り権限自体はStorageルールで引き続き保護されます)。

### 7. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 を開きます。

`/login` から管理者としてログイン後、`/admin` から新年度号を作成し、各号の `/issues/[issueId]/admin` の名簿欄からメンバー(名前・学年)を登録してください。一般メンバーは年度一覧(`/`)からそのまま利用でき、初回に自分の名前を名簿から選ぶだけです。

## スクリプト

```bash
npm run dev     # 開発サーバー
npm run build   # 本番ビルド
npm run start   # 本番サーバー
npm run lint    # ESLint
```

## デプロイ

Vercel など任意のNext.js対応ホスティングにインポートし、`.env.local` と同じ環境変数(`NEXT_PUBLIC_FIREBASE_*`)を設定してください。バックエンドはFirebase(Authentication / Firestore / Storage)側の設定のみで完結します。

## デザイン方針

- 絵文字は使用しません。
- 彩度を抑えた配色、端正な書体(サンセリフ本文 + 見出しに控えめなセリフ体)、余白を生かしたレイアウトで、機関誌にふさわしい落ち着いた誌面を目指しています。
- 過度な角丸・ドロップシャドウ・光沢は避け、号 → セクション → 本文という情報の階層を優先しています。
