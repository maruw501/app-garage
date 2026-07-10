# APP GARAGE

開発した複数のWebアプリを紹介し、利用者が各アプリを開けるポートフォリオ型の静的ホームページです。

HTML、CSS、JavaScriptだけで動作します。サーバー、データベース、有料API、ログイン機能、個人情報収集、広告は使用していません。

## ファイル構成

```text
index.html
styles.css
apps.js
script.js
README.md
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

インターネット接続がなくても、ローカル確認できます。

## アプリの追加方法

アプリ情報は `apps.js` の `APPS` 配列で管理しています。

新しいアプリを追加するときは、`APPS` 配列の末尾に次のような1件を追加します。

```js
{
  id: "sample-app",
  title: "サンプルアプリ",
  category: "tools",
  categoryLabel: "便利ツール",
  icon: "SP",
  accentColor: "#6dff9f",
  description: "カードに表示する短い説明です。",
  longDescription: "モーダルに表示する詳しい説明です。",
  tags: ["タグ1", "タグ2"],
  url: "",
  status: "準備中",
  featured: false,
}
```

追加すると、アプリカード、公開アプリ数、検索、カテゴリ絞り込みに自動で反映されます。

## アプリURLの設定方法

`apps.js` の各アプリにある `url` を変更します。

```js
url: "https://example.pages.dev/",
status: "公開中",
```

`url` が空文字のままの場合、画面では「準備中」と表示され、モーダル内の「アプリを開く」ボタンは無効になります。

## statusに設定できる値

```text
公開中
開発中
準備中
```

## featuredの使い方

`featured: true` にすると、アプリカードに「おすすめ」マークが表示されます。

```js
featured: true,
```

## サイト名の変更方法

`apps.js` の `SITE_CONFIG.siteName` を変更します。

```js
const SITE_CONFIG = {
  siteName: "APP GARAGE",
  contactEmail: "your-email@example.com",
  contactSubject: "アプリ制作の相談",
};
```

画面上のロゴ、フッター、ブラウザタイトルに反映されます。

SEO用の初期表示も完全に変更したい場合は、`index.html` 内の `title`、`description`、OGPタグの文言も同じ名前に合わせてください。

## メールアドレスの変更方法

お問い合わせボタンのメールアドレスは `apps.js` の1か所だけで管理しています。

```js
contactEmail: "your-email@example.com",
```

自分のメールアドレスに書き換えると、お問い合わせボタンが `mailto:` 形式で開きます。

## Cloudflare Pagesで無料公開する方法

GitHub連携は必須ではありません。パソコンからフォルダを直接アップロードする方法です。

1. Cloudflareへ無料登録します。
2. Cloudflareの管理画面で `Workers & Pages` を開きます。
3. `Pages` の新規プロジェクトを作成します。
4. `Direct Upload` を選択します。
5. このホームページフォルダをアップロードします。
6. 無料の `○○.pages.dev` URLが発行されます。
7. 発行されたURLをパソコンとスマートフォンで開いて確認します。

アップロードするフォルダには、少なくとも次のファイルが含まれていれば公開できます。

```text
index.html
styles.css
apps.js
script.js
assets/
```

## 公開後に内容を更新する方法

1. 手元のファイルを編集します。
2. `index.html` をダブルクリックして表示を確認します。
3. Cloudflare Pagesのプロジェクト画面を開きます。
4. 新しいDirect Uploadとして、修正後のフォルダをアップロードします。
5. 数十秒ほど待つと、同じURLで新しい内容が表示されます。

## 料金について

このサイトは静的ファイルだけで構成しているため、Cloudflare Pagesの無料プランで公開できます。

追加で有料API、サーバー、データベース、外部テンプレート、有料素材は使用していません。
