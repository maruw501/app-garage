const SITE_CONFIG = {
  siteName: "APP GARAGE",
  contactEmail: "your-email@example.com",
  contactSubject: "アプリ制作の相談",
};

const APP_CATEGORIES = [
  { id: "all", label: "すべて" },
  { id: "business", label: "ビジネス" },
  { id: "tools", label: "便利ツール" },
  { id: "creative", label: "クリエイティブ" },
  { id: "game", label: "ゲーム" },
  { id: "other", label: "その他" },
];

const APPS = [
  {
    id: "smart-survey",
    title: "スマートアンケート",
    category: "business",
    categoryLabel: "ビジネス",
    icon: "SA",
    accentColor: "#6dff9f",
    description: "スマホから短時間でアンケートを作成し、回答結果を自動で集計できるシンプルなツール。",
    longDescription:
      "現場や店舗で必要なアンケートをすばやく作成し、回答URLの共有から集計確認までを迷わず進められることを目指したWebアプリです。",
    tags: ["アンケート", "自動集計", "スマホ対応"],
    url: "",
    status: "準備中",
    featured: true,
  },
  {
    id: "sales-message-maker",
    title: "営業連絡メーカー",
    category: "business",
    categoryLabel: "ビジネス",
    icon: "EM",
    accentColor: "#8ffcff",
    description: "予定、天気、イベント情報を整理し、毎日の営業連絡文を効率よく作成する業務支援アプリ。",
    longDescription:
      "毎日の連絡文に必要な情報を整理し、抜け漏れを減らしながら短時間で文章化するための業務支援ツールです。",
    tags: ["文章作成", "業務効率化", "店舗運営"],
    url: "",
    status: "開発中",
    featured: true,
  },
  {
    id: "visibility-check",
    title: "見通しチェック",
    category: "tools",
    categoryLabel: "便利ツール",
    icon: "VC",
    accentColor: "#ffd166",
    description: "道路や駐車場などの見通しを確認し、危険箇所の把握をサポートする便利ツール。",
    longDescription:
      "現地確認のメモやチェック観点を整理し、安全確認をシンプルに進めるための補助ツールです。",
    tags: ["安全確認", "チェック", "便利ツール"],
    url: "",
    status: "準備中",
    featured: false,
  },
  {
    id: "am-portal",
    title: "AMポータル",
    category: "business",
    categoryLabel: "ビジネス",
    icon: "AM",
    accentColor: "#b6ff6d",
    description: "売上、実績、週報など、複数の業務情報を一か所にまとめて管理するポータルアプリ。",
    longDescription:
      "散らばりやすい業務情報を一画面にまとめ、確認、共有、振り返りをしやすくするためのポータル型アプリです。",
    tags: ["ダッシュボード", "データ管理", "ポータル"],
    url: "",
    status: "開発中",
    featured: false,
  },
  {
    id: "prompt-studio",
    title: "画像プロンプト工房",
    category: "creative",
    categoryLabel: "クリエイティブ",
    icon: "IP",
    accentColor: "#c7a6ff",
    description: "イラスト生成に使う文章を、目的やテイストに合わせて簡単に組み立てられるアプリ。",
    longDescription:
      "作りたい絵の方向性、雰囲気、構図、色味などを選びながら、画像生成向けの文章を整えるためのクリエイティブ支援アプリです。",
    tags: ["画像生成", "プロンプト", "クリエイティブ"],
    url: "",
    status: "準備中",
    featured: false,
  },
  {
    id: "presidents-ambition",
    title: "社長の野望",
    category: "game",
    categoryLabel: "ゲーム",
    icon: "SY",
    accentColor: "#ff9f7a",
    description: "会社経営と企業買収をテーマにした、オリジナル経営シミュレーションゲーム。",
    longDescription:
      "資金、人材、買収判断を組み合わせながら会社を成長させる、ブラウザで遊べる経営シミュレーションゲームです。",
    tags: ["経営ゲーム", "買収", "シミュレーション"],
    url: "",
    status: "準備中",
    featured: true,
  },
];

window.SITE_CONFIG = SITE_CONFIG;
window.APP_CATEGORIES = APP_CATEGORIES;
window.APPS = APPS;
