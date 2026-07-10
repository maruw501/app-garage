# APP GARAGE

APP GARAGE は、無料で使えるWebアプリの公開と、企業・店舗・介護施設・個人事業主向けの専用アプリ開発相談を受け付ける静的ホームページです。

HTML、CSS、JavaScriptだけで動作します。サーバー、データベース、有料API、ログイン機能、個人情報収集、広告は使用していません。Cloudflare Pagesの無料プランへ、そのままアップロードして公開できます。

## ファイル構成

```text
index.html
styles.css
script.js
README.md
js/
  app-data.js
assets/
  icons/
    favicon.svg
    app-garage-mark.svg
  images/
```

## ホームページの開き方

1. このフォルダを開きます。
2. `index.html` をダブルクリックします。
3. ブラウザで APP GARAGE が表示されます。

インターネット接続がなくても、ローカルで確認できます。

## アプリデータの管理場所

アプリ情報は `js/app-data.js` の `APPS` 配列で管理しています。

HTMLへ直接アプリ情報を書き込む必要はありません。新しいアプリを追加するときは、`APPS` 配列へ1件追加するだけで、一覧・検索・詳細モーダルへ自動表示されます。

```js
{
  id: "sample-app",
  title: "アプリ名",
  catchCopy: "短いキャッチコピー",
  category: "カテゴリ名",
  description: "カードに表示する説明",
  longDescription: "詳細画面に表示する説明",
  features: ["主な機能1", "主な機能2"],
  targetUsers: "利用する人",
  devices: "スマートフォン / パソコン",
  status: "近日公開",
  type: "free",
  icon: "AG",
  accentColor: "#6dff9f",
  tags: ["タグ1", "タグ2"],
  url: "",
  image: "",
  featured: false,
  published: true,
}
```

## 無料アプリの追加方法

`js/app-data.js` の `APPS` 配列へ、`type: "free"` のデータを追加します。

```js
type: "free",
status: "近日公開",
url: "",
```

`url` が空欄、または `"#"` の場合は「無料で使う」ボタンを表示せず、「近日公開」と表示します。

公開URLが決まったら、次のように `url` を設定してください。

```js
url: "https://example.pages.dev/",
status: "公開中",
```

この場合だけ、カードと詳細画面に「無料で使う」ボタンが表示されます。

## 開発中アプリの追加方法

`js/app-data.js` の `APPS` 配列へ、`type: "development"` のデータを追加します。

```js
type: "development",
status: "開発中",
progress: "開発中",
url: "",
```

`progress` には次のいずれかを設定してください。

```text
企画中
開発中
テスト中
近日公開
```

日付が決まっていない場合は、公開予定日を書かないでください。

## 開発事例の追加方法

`js/app-data.js` の `APPS` 配列へ、`type: "case-study"` のデータを追加します。

```js
type: "case-study",
status: "開発事例",
url: "",
```

開発事例には「アプリを開く」ボタンは表示されません。詳細画面には、一般公開していない開発事例であることを示す注意文が表示されます。

情報が不足している場合は、無理に内容を作らず、次のように登録してください。

```js
longDescription: "詳細準備中",
features: ["詳細準備中"],
```

## 表示・非表示の設定

`published` でサイトへの表示を切り替えます。

```js
published: true,  // 表示する
published: false, // 表示しない
```

`featured: true` にすると、無料アプリ一覧で目立つカードとして表示できます。

```js
featured: true,
```

## サイト名の変更方法

サイト名は `js/app-data.js` の `SITE_CONFIG.siteName` を変更します。

```js
const SITE_CONFIG = {
  siteName: "APP GARAGE",
};
```

必要に応じて、`index.html` の `title`、`meta description`、OGPタグも新しいサイト名に合わせて変更してください。

## メールアドレスの変更方法

問い合わせ先は `js/app-data.js` の `SITE_CONFIG.contactEmail` を変更します。

```js
contactEmail: "maruw@outlook.jp",
```

件名は `contactSubject`、本文の自動入力項目は `contactBodyItems` で変更できます。日本語は `script.js` 側でURLエンコードして `mailto:` に設定しています。

## 料金表示の変更方法

料金は `index.html` の `pricing` セクションで管理しています。

現在の表示は次の内容です。

```text
アプリ開発: 通常 50,000円～ / 特別価格 20,000円～
保守費用: 月額1,000円～
完全買い切りプラン: 要相談
修正対応: 3回まで無料、4回目以降は1回あたり＋2,000円～
満足保証: 納品後2週間以内の連絡で開発費を全額いただかない
```

## Cloudflare Pagesで無料公開する方法

GitHub連携は必須ではありません。パソコンからフォルダを直接アップロードする方法が一番簡単です。

1. Cloudflareへ無料登録します。
2. Cloudflareの管理画面で `Workers & Pages` を開きます。
3. `Pages` の新規プロジェクトを作成します。
4. `Direct Upload` を選択します。
5. このホームページフォルダをアップロードします。
6. 無料の `○○.pages.dev` URLが発行されます。
7. 発行されたURLをスマートフォンで開いて確認します。

アップロードするフォルダには、少なくとも次のファイルとフォルダが含まれている必要があります。

```text
index.html
styles.css
script.js
js/
assets/
README.md
```

## GitHubを利用して更新する場合

GitHubへこのフォルダをアップロードしておくと、変更履歴を残しながら管理できます。

Cloudflare PagesでGitHub連携を使う場合は、リポジトリを選択し、ビルド設定は空欄または不要のままで問題ありません。静的ファイルだけなので、ビルドコマンドは不要です。

## 公開後に内容を更新する方法

1. 手元のファイルを編集します。
2. `index.html` をダブルクリックして表示を確認します。
3. Cloudflare Pagesのプロジェクト画面を開きます。
4. 新しいDirect Uploadとして、修正後のフォルダをアップロードします。
5. 数十秒ほど待つと、同じURLで新しい内容が表示されます。

GitHub連携を使っている場合は、変更をGitHubへ反映するとCloudflare Pages側も更新できます。

## 無料運用について

このサイトは静的ファイルだけで構成しているため、Cloudflare Pagesの無料プランで公開できます。

追加で有料API、サーバー、データベース、有料テンプレート、有料素材は使用していません。商用サイトとして使う場合も、Cloudflare PagesとGitHubの無料枠内で運用できます。
