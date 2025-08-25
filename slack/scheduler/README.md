# Slack通知スケジューラー

## ディレクトリ構成

```
slack/
└── scheduler/                       # スケジューラー専用ディレクトリ
    ├── scheduler.js                 # メインのスケジューラー機能
    ├── trigger-management.html      # メインHTML（ダイアログUI構造）
    ├── trigger-management_css.html  # CSSスタイル
    ├── trigger-management_js.html   # JavaScript機能
    └── README.md                   # このファイル
```

## ファイル説明

### scheduler.js
- メインの定期通知スケジューラー機能（移動済み）
- `executeScheduledNotifications()`: 定期通知のマスタートリガー関数
- `manageScheduledNotificationTrigger()`: トリガー管理UI表示関数
- その他のトリガー設定・削除関数

### scheduler/trigger-management.html
- トリガー管理ダイアログのメインHTMLテンプレート
- サーバーサイド変数（currentStatus）をテンプレートエンジンで埋め込み
- CSSとJSファイルを外部読み込み

### scheduler/trigger-management_css.html
- ダイアログのスタイル定義
- レスポンシブデザイン対応
- ボタンスタイル、メッセージ表示スタイルなど

### scheduler/trigger-management_js.html
- クライアントサイドJavaScript機能
- Google Apps Script実行関数の呼び出し
- UI更新処理（ステータス表示、メッセージ表示、ローディング状態）

## 使用方法

1. `manageScheduledNotificationTrigger()`を実行してトリガー管理UIを表示
2. UI上で本番設定（1時間ごと）、検証設定（1分ごと）、削除を選択
3. 設定後、`executeScheduledNotifications()`が自動で定期実行される

## 特徴

- HTML/CSS/JSファイル分離による保守性向上
- `scheduler.js`の専用ディレクトリ配置でより整理された構成
- テンプレートエンジン使用でサーバーサイドデータの埋め込み
- クリーンなコード構造とファイル管理
