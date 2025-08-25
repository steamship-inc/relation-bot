# Slack フィルター設定モジュール

このモジュールは、Slack通知フィルタ設定を管理するためのUIを提供します。HTMLとJavaScriptを分離し、自治体選択とフィルター設定を統合したモーダルを使用しています。

## ファイル構造

```
slack/slack-filter/
├── ticketFilter-config.js   # サーバーサイドJavaScript（Google Apps Script）
├── ticketFilter.html        # メインHTML（自治体選択 + フィルター設定）
├── ticketFilter_css.html    # スタイルシート（CSS）
├── ticketFilter_js.html     # クライアントサイドJavaScript
└── README.md               # このファイル
```

## 機能概要

### 1. 自治体選択画面
- 全自治体のリストから選択
- 検索機能（自治体名、受信箱ID、都道府県で検索）
- レスポンシブデザイン

### 2. フィルター設定画面
- チケット分類フィルタ（通知対象分類の選択）
- ラベルフィルタ（通知対象ラベルの選択）
- リアルタイム設定プレビュー
- 戻るボタンで自治体選択画面に戻れる

## 使用方法

1. `showFilterConfigDialog()` を呼び出すとモーダルが表示されます
2. 自治体を選択して「この自治体で設定する」をクリック
3. フィルター条件を設定し、「保存」をクリック
4. 設定は📮受信箱シートのG列に保存されます

## 技術仕様

### サーバーサイド関数
- `showFilterConfigDialog()`: エントリーポイント
- `showIntegratedModalDialog(configs)`: 統合モーダル表示
- `getFilterConfigData(messageBoxId)`: フィルター設定データ取得
- `saveFilterConfig(messageBoxId, filterConfig)`: フィルター設定保存
- `include(filename)`: HTMLファイル読み込みヘルパー

### クライアントサイド機能（ticketFilter_js.html）
- 自治体検索・選択
- フィルター設定UI
- リアルタイムプレビュー
- 通知システム
- モーダル間の切り替え

### スタイル（ticketFilter_css.html）
- レスポンシブデザイン
- 統一されたUI/UX
- アニメーション効果

## カスタマイズ

### スタイルの変更
`ticketFilter_css.html` を編集してください。

### 機能の追加
- サーバーサイド: `ticketFilter-config.js`
- クライアントサイド: `ticketFilter_js.html`
- UI: `ticketFilter.html`

## 開発時の注意点

1. Google Apps Scriptでは外部ファイル読み込みに `include()` 関数を使用
2. CSSとJavaScriptは `.html` 拡張子で作成し、適切なタグで囲む（`<style>`、`<script>`）
3. HTMLテンプレート内でのサーバーサイドデータの埋め込みは `<?= variable ?>` を使用
4. クライアントサイドからサーバーサイド関数の呼び出しは `google.script.run` を使用
