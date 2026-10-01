# ゆかレシピ｜GitHub Pagesで公開する無料版

**PC・スマホ両対応／ビルド不要／Vercel・VS Code不要**

冷蔵庫の写真から食材をAI判別し、レシピを提案するアプリです。セブン‐イレブンで探す買い足しメモを作れます。AI未接続でも、食材の手入力・内蔵レシピ・買い物メモは利用できます。

> **重要：** GitHub Pagesにはサーバー処理がありません。写真のAI判別・AIレシピには、無料枠のある **Gemini API + Cloudflare Workers** を別に設定します。セブン‐イレブンの店舗在庫・価格・注文とは連携していません。

## ファイル一覧

| ファイル | 役割 |
|---|---|
| `index.html` | アプリの画面 |
| `style.css` | PC・スマホ両対応のデザイン |
| `app.js` | 写真表示・食材登録・内蔵レシピ・買い物メモ・AI接続 |
| `favicon.svg` | ブラウザのアイコン |
| `.nojekyll` | GitHub Pages用の空ファイル（任意） |
| `worker.js` | Cloudflareに貼り付けるAI中継のコード（GitHub上で実行されません） |
| `README.md` | この手順書 |

## 手順 1：まずGitHubにアップロードする

1. このZIPをダウンロードして **解凍** します。ZIP自体をアップロードしないでください。
2. 現在のリポジトリ [satonowa311-coder/resipi](https://github.com/satonowa311-coder/resipi) を開きます。
3. `Add file` → `Upload files` を選び、解凍したフォルダの**中身**をアップロードします。`index.html` は既存のファイルを上書きする必要があります。旧版の `package.json`、`vite.config.js`、`postcss.config.js`、`tailwind.config.js` は今回使いません（まずは残っていても問題ありません）。
4. `Commit changes` を押します。
5. GitHubの `Settings` → `Pages` が `Deploy from a branch`、`main`、`/(root)` なら設定はそのままです。
6. 数分待って [https://satonowa311-coder.github.io/resipi/](https://satonowa311-coder.github.io/resipi/) を開きます。旧版が表示されたら `Ctrl + Shift + R` で再読み込みしてください。

**ここまでで手入力・内蔵レシピ・買い物メモは使えます。AIはまだ動きません。**

### GitHubから古いファイルを消す？

旧版の `package.json`、`postcss.config.js`、`tailwind.config.js`、`vite.config.js` は、今回のサイトでは利用しません。新しい画面を確認できてから、必要に応じて削除してください。まずは古いファイルを無理に消さなくて大丈夫です。

## 手順 2：Geminiの無料枠でAPIキーを取得

1. [Google AI Studio：APIキー](https://aistudio.google.com/apikey) にアクセスし、利用可能なプロジェクトでAPIキーを発行します。
2. **APIキーをGitHubに貼らないでください。** 次のCloudflareで `GEMINI_API_KEY` というSecretとして登録します。
3. Geminiの無料枠にはモデルごとの利用上限があります。超えた場合はAIが利用できなくなることがあります。最新の条件は[公式料金表](https://ai.google.dev/gemini-api/docs/pricing)で確認してください。
4. 無料枠では、送信内容がGoogleの製品改善に使われる場合があります。個人情報や、人が写り込んだ写真などは送らないでください。

## 手順 3：Cloudflare Workersの無料枠でAI中継を作る

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/) に無料アカウントでログインします。
2. `Workers & Pages` からWorkerを新規作成します。画面の表示名は更新によって異なる場合があります。
3. オンラインのコード編集画面で、付属の `worker.js` の内容を**全文貼り付け**てデプロイします。
4. Workerの `Settings` → `Variables and Secrets` などから、次の設定を登録して再デプロイします。

   | 名前 | 種類 | 値 |
   |---|---|---|
   | `GEMINI_API_KEY` | **Secret** | AI Studioで発行したAPIキー |
   | `APP_PASSCODE` | **Secret** | 自分で決める8文字以上の合言葉 |
   | `ALLOWED_ORIGIN` | Text（任意） | `https://satonowa311-coder.github.io` |
   | `GEMINI_MODEL` | Text（任意） | `gemini-3.5-flash-lite`（変更しなければこのモデルを使用） |

5. 作成された `https://あなたのWorker名.あなたのサブドメイン.workers.dev` というURLを控えます。
6. 公開した「ゆかレシピ」を開き、右上の「AI設定」に、**WorkerのURL** と **APP_PASSCODEで決めた合言葉**を入力して保存します。GeminiのAPIキーをアプリには入力しません。
7. 食材の写真を選び、「AIで食材を判別」を押して動作を確認します。判定された食材は必ず目視で確認・修正してください。

### AIを使う人が複数いる場合

WorkerのURLは、アプリの「AI設定」から各自で登録できます。全員にURLだけを共有したい場合は `app.js` の冒頭にある `DEFAULT_WORKER_URL = ""` に、Workerの公開URLを設定して再アップロードします。**合言葉・APIキーは絶対にapp.jsへ書かないでください。** 合言葉は原則、AIを使う人だけに個別に知らせます。

> **利用上の注意：** WorkerのURLは公開されます。合言葉とOriginチェックは簡易保護であり、完全な不正利用防止ではありません。合言葉は推測されにくいものを使い、APIの利用状況を定期的に確認してください。広く一般公開する場合はCloudflare Turnstileやレート制限など、さらに保護する仕組みが必要です。

## 手順 4：使い方

1. 「写真を撮る・選ぶ」で食材を選んで「AIで食材を判別」（AI接続時）。または「今ある食材を追加」で入力。
2. 誤判定は食材名の右にある `×` で削除。
3. 人数・時間・使いたくない食材を選んで「この食材でレシピを探す」。AIが未接続の場合は、内蔵の定番レシピが出ます。
4. レシピの「作り方を見る」で手順を確認。
5. 「買い物メモに追加」で不足食材をまとめ、「メモをコピー」。セブン‐イレブン公式商品ページへのリンクから商品情報を確認できます。

## 料金・データの注意

- GitHub Pages：GitHub Freeの公開リポジトリで利用可能。
- Cloudflare Workers：無料プランは執筆時点で **1日10万リクエスト** まで。ただしGemini側の無料上限は別です。
- Gemini API：`gemini-3.5-flash-lite` は公式の無料枠が設定されていますが、**モデルへのアクセス可否と上限はアカウント・時期によって変わり得ます**。有料プランへ切り替える場合は課金条件を確認してください。
- 食材・買い物メモ・Worker URLはブラウザ内に保存。合言葉はタブのセッション内のみ保存。写真は端末に永続保存せず、AIで写真判定したときだけCloudflare経由でGoogleへ送信されます。
- AIは食品・食材を誤判定することがあります。食物アレルギー、賞味期限、生肉・卵の火の通りは必ずご自身で確認してください。
- 買い足しメモは**セブン‐イレブンで探すためのリスト**で、店舗の在庫や価格を自動取得するものではありません。

## 参考（公式）

- [GitHub Pagesについて](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Gemini API料金表](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini APIの画像入力](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Cloudflare Workers無料枠の制限](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare WorkersのSecret](https://developers.cloudflare.com/workers/configuration/secrets/)
