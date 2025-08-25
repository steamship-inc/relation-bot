# メニュー関数コールツリー

このファイルは、Google Apps Script のメニューシステムで呼び出される各関数のコールツリーを記録したものです。

## 📋 目次

- [🟩 re:lation メニュー](#-relation-メニュー)
- [🔔 slack メニュー](#-slack-メニュー)
- [🔍 tool メニュー](#-tool-メニュー)

---

## 🟩 re:lation メニュー

### 🎫 未対応チケット取得 (`fetchOpenTickets`)

```
fetchOpenTickets() [relation/fetchTickets.js:5-218] ※未対応チケットを全自治体から取得（213行）
├── loadMunicipalityConfigFromSheet() [relation/municipality-config.js:19-72] ※自治体設定読み込み（53行）
│   └── parseSlackNotificationFilter() [relation/municipality-config.js:75-91] ※フィルタ設定解析（16行）
├── getRelationApiKey() [relation/apiEndpoint.js:53-55] ※APIキー取得（2行）
├── getRelationEndpoint() [relation/apiEndpoint.js:21-51] ※エンドポイントURL生成（30行）
├── parseDate() [relation/fetchTickets.js:220-233] ※日付解析（13行）
└── (間接的に) sendSlackToMunicipality() [slack/notifications.js:144-169] ※自治体別Slack通知送信（25行）
    ├── applySlackNotificationFilter() [slack/notifications.js:171-203] ※通知フィルタ適用（32行）
    ├── createSlackMessage() [slack/message-builder.js:12-59] ※Slackメッセージ構築（47行）
    └── sendWithBotToken() [slack/notifications.js:40-79] ※Botトークン使用送信（39行）
```

### 📮 受信箱取得 (`fetchMessageBoxes`)

```
fetchMessageBoxes() [relation/fetchMessageBoxes.js:2-255] ※受信箱データ取得・シート更新（253行）
├── getRelationApiKey() [relation/apiEndpoint.js:53-55] ※APIキー取得（2行）
├── getRelationEndpoint() [relation/apiEndpoint.js:21-51] ※エンドポイントURL生成（30行）
├── loadCodeTableMap() [relation/fetchMessageBoxes.js:257-287] ※コード表読み込み（30行）
├── findMunicipalityInCodeTable() [relation/fetchMessageBoxes.js:289-380] ※自治体コード検索（91行）
├── getMunicipalityDataFromSheet() [relation/fetchMessageBoxes.js:382-463] ※既存自治体データ取得（81行）
│   └── findColumnIndex() [relation/fetchMessageBoxes.js:465-475] ※列インデックス検索（10行）
└── getRelationEndpoint() [relation/apiEndpoint.js:21-51] ※メッセージボックスURL生成（30行）
```

### 🗂️ チケット分類取得 (`fetchCaseCategories`)

```
fetchCaseCategories() [relation/fetchCaseCategories.js:2-156] ※チケット分類データ取得・シート出力（154行）
├── loadMunicipalityConfigFromSheet() [relation/municipality-config.js:19-72] ※自治体設定読み込み（53行）
│   └── parseSlackNotificationFilter() [relation/municipality-config.js:75-91] ※フィルタ設定解析（16行）
├── getRelationApiKey() [relation/apiEndpoint.js:53-55] ※APIキー取得（2行）
└── getRelationEndpoint() [relation/apiEndpoint.js:21-51] ※エンドポイントURL生成（30行）
```

### 🏷️ ラベル取得 (`fetchLabels`)

```
fetchLabels() [relation/fetchLabels.js:2-156] ※ラベルデータ取得・シート出力（154行）
├── loadMunicipalityConfigFromSheet() [relation/municipality-config.js:19-72] ※自治体設定読み込み（53行）
│   └── parseSlackNotificationFilter() [relation/municipality-config.js:75-91] ※フィルタ設定解析（16行）
├── getRelationApiKey() [relation/apiEndpoint.js:53-55] ※APIキー取得（2行）
└── getRelationEndpoint() [relation/apiEndpoint.js:21-51] ※エンドポイントURL生成（30行）
```

### 🔄 全データ更新（順次実行） (`runDataUpdateBatch`)

```
runDataUpdateBatch() [menu/menu.js:38-95] ※全データ一括更新処理（57行）
├── fetchCaseCategories() [relation/fetchCaseCategories.js:2-156] ※チケット分類データ取得・シート出力（154行）
│   ├── loadMunicipalityConfigFromSheet() [relation/municipality-config.js:19-72] ※自治体設定読み込み（53行）
│   │   └── parseSlackNotificationFilter() [relation/municipality-config.js:75-91] ※フィルタ設定解析（16行）
│   ├── getRelationApiKey() [relation/apiEndpoint.js:53-55] ※APIキー取得（2行）
│   └── getRelationEndpoint() [relation/apiEndpoint.js:21-51] ※エンドポイントURL生成（30行）
├── fetchLabels() [relation/fetchLabels.js:2-156] ※ラベルデータ取得・シート出力（154行）
│   ├── loadMunicipalityConfigFromSheet() [relation/municipality-config.js:19-72] ※自治体設定読み込み（53行）
│   │   └── parseSlackNotificationFilter() [relation/municipality-config.js:75-91] ※フィルタ設定解析（16行）
│   ├── getRelationApiKey() [relation/apiEndpoint.js:53-55] ※APIキー取得（2行）
│   └── getRelationEndpoint() [relation/apiEndpoint.js:21-51] ※エンドポイントURL生成（30行）
└── fetchOpenTickets() [relation/fetchTickets.js:5-218] ※未対応チケット取得（213行）
    ├── loadMunicipalityConfigFromSheet() [relation/municipality-config.js:19-72] ※自治体設定読み込み（53行）
    │   └── parseSlackNotificationFilter() [relation/municipality-config.js:75-91] ※フィルタ設定解析（16行）
    ├── getRelationApiKey() [relation/apiEndpoint.js:53-55] ※APIキー取得（2行）
    ├── getRelationEndpoint() [relation/apiEndpoint.js:21-51] ※エンドポイントURL生成（30行）
    └── parseDate() [relation/fetchTickets.js:220-233] ※日付解析（13行）
```

---

## 🔔 slack メニュー

### 📤 手動送信 (`manualSendSlack`)

```
manualSendSlack() [slack/sendUI/sendUI.js:56-101] ※手動Slack送信メイン処理（45行）
├── selectMunicipalityWithSearchableDialog() [slack/sendUI/sendUI.js:15-54] ※検索可能自治体選択ダイアログ（39行）
├── processSelectedMunicipality() [slack/sendUI/sendUI.js:103-135] ※選択自治体処理（32行）
│   ├── getTicketsFromSheet() [slack/data-fetcher.js:11-92] ※シートからチケット取得（81行）
│   │   ├── getCaseCategoriesMap() [slack/data-fetcher.js:94-145] ※チケット分類マップ取得（51行）
│   │   └── getLabelsMap() [slack/data-fetcher.js:147-199] ※ラベルマップ取得（52行）
│   └── sendSlackToMunicipality() [slack/notifications.js:144-169] ※自治体別Slack通知送信（25行）
│       ├── applySlackNotificationFilter() [slack/notifications.js:171-203] ※通知フィルタ適用（32行）
│       ├── createSlackMessage() [slack/message-builder.js:12-59] ※Slackメッセージ構築（47行）
│       │   ├── getCategoryNames() [slack/data-fetcher.js:201-217] ※分類名取得（16行）
│       │   ├── getLabelNames() [slack/data-fetcher.js:219-241] ※ラベル名取得（22行）
│       │   ├── formatDate() [slack/data-fetcher.js:243-247] ※日付フォーマット（4行）
│       │   └── getRelationEndpoint() [relation/apiEndpoint.js:21-51] ※エンドポイントURL生成（30行）
│       └── sendWithBotToken() [slack/notifications.js:40-79] ※Botトークン使用送信（39行）
└── loadMunicipalityConfigFromSheet() [relation/municipality-config.js:19-72] ※自治体設定読み込み（53行）
    └── parseSlackNotificationFilter() [relation/municipality-config.js:75-91] ※フィルタ設定解析（16行）
```

### 🔧 通知フィルタ設定 (`showFilterConfigDialog`)

```
showFilterConfigDialog() [slack/ticketFilter/ticketFilter-config.js:10-26] ※フィルタ設定ダイアログ表示（16行）
├── loadMunicipalityConfigFromSheet() [relation/municipality-config.js:19-72] ※自治体設定読み込み（53行）
│   └── parseSlackNotificationFilter() [relation/municipality-config.js:75-91] ※フィルタ設定解析（16行）
├── showIntegratedModalDialog() [slack/ticketFilter/ticketFilter-config.js:28-45] ※統合モーダル表示（17行）
├── getFilterConfigData() [slack/ticketFilter/ticketFilter-config.js:56-82] ※フィルタ設定データ取得（26行）
│   ├── getCaseCategoriesMap() [slack/data-fetcher.js:94-145] ※チケット分類マップ取得（51行）
│   └── getLabelsMap() [slack/data-fetcher.js:147-199] ※ラベルマップ取得（52行）
└── saveFilterConfig() [slack/ticketFilter/ticketFilter-config.js:84-100] ※フィルタ設定保存（16行）
```

### ⏰ 定期通知トリガー管理 (`manageScheduledNotificationTrigger`)

```
manageScheduledNotificationTrigger() [slack/scheduler/scheduler.js:269-287] ※定期通知トリガー管理UI（18行）
├── getCurrentTriggerStatus() [slack/scheduler/scheduler.js:289-319] ※現在のトリガー状態取得（30行）
├── setupProductionTrigger() [slack/scheduler/scheduler.js:321-343] ※本番用トリガー設定（22行）
├── setupTestTrigger() [slack/scheduler/scheduler.js:411-436] ※検証用トリガー設定（25行）
└── removeScheduledNotificationTrigger() [slack/scheduler/scheduler.js:473-488] ※定期通知トリガー削除（15行）
```

#### 🕐 定期通知実行フロー (`executeScheduledNotifications`)

```
executeScheduledNotifications() [slack/scheduler/scheduler.js:15-115] ※定期通知の自動実行処理（100行）
├── loadMunicipalityConfigsFromSheet() [slack/scheduler/scheduler.js:117-197] ※自治体設定読み込み（80行）
├── checkCronSchedule() [slack/scheduler/scheduler.js:199-267] ※Cron設定チェック（68行）
├── getTicketsFromSheet() [slack/data-fetcher.js:11-92] ※シートからチケット取得（81行）
│   ├── getCaseCategoriesMap() [slack/data-fetcher.js:94-145] ※チケット分類マップ取得（51行）
│   └── getLabelsMap() [slack/data-fetcher.js:147-199] ※ラベルマップ取得（52行）
└── sendSlackToMunicipality() [slack/notifications.js:144-169] ※自治体別Slack通知送信（25行）
    ├── applySlackNotificationFilter() [slack/notifications.js:171-203] ※通知フィルタ適用（32行）
    ├── createSlackMessage() [slack/message-builder.js:12-59] ※Slackメッセージ構築（47行）
    │   ├── getCategoryNames() [slack/data-fetcher.js:201-217] ※分類名取得（16行）
    │   ├── getLabelNames() [slack/data-fetcher.js:219-241] ※ラベル名取得（22行）
    │   ├── formatDate() [slack/data-fetcher.js:243-247] ※日付フォーマット（4行）
    │   └── getRelationEndpoint() [relation/apiEndpoint.js:21-51] ※エンドポイントURL生成（30行）
    └── sendWithBotToken() [slack/notifications.js:40-79] ※Botトークン使用送信（39行）
```

---

## 🔍 tool メニュー

### 📋 チケット詳細確認 (`openTicketDetailPage`)

```
openTicketDetailPage() [ticket-viewer/viewer_manager.js:9-31] ※チケット詳細ページ表示（22行）
├── loadMunicipalities() [ticket-viewer/viewer_manager.js:33-89] ※自治体一覧読み込み（56行）
├── fetchTicketList() [ticket-viewer/viewer_manager.js:91-151] ※チケット一覧取得（60行）
│   ├── getRelationApiKey() [relation/apiEndpoint.js:53-55] ※APIキー取得（2行）
│   ├── getRelationEndpoint() [relation/apiEndpoint.js:21-51] ※エンドポイントURL生成（30行）
│   └── getTicketTitleFromSheet() [ticket-viewer/viewer_manager.js:153-195] ※シートからタイトル取得（42行）
└── fetchTicketDetailWithSheetTitle() [ticket-viewer/viewer_manager.js:197-219] ※タイトル付きチケット詳細取得（22行）
    ├── fetchTicketDetail() [relation/fetchTickets.js:235-264] ※チケット詳細取得（29行）
    │   ├── getRelationApiKey() [relation/apiEndpoint.js:53-55] ※APIキー取得（2行）
    │   └── getRelationEndpoint() [relation/apiEndpoint.js:21-51] ※エンドポイントURL生成（30行）
    └── getTicketTitleFromSheet() [ticket-viewer/viewer_manager.js:153-195] ※シートからタイトル取得（42行）
```

---

## 🔧 共通ユーティリティ関数

これらの関数は複数のメニュー項目から呼び出される共通関数です：

### 設定管理
- `loadMunicipalityConfigFromSheet()` [relation/municipality-config.js:19-72] ※自治体設定読み込み（53行）
- `parseSlackNotificationFilter()` [relation/municipality-config.js:75-91] ※フィルタ設定解析（16行）

### API接続
- `getRelationApiKey()` [relation/apiEndpoint.js:53-55] ※APIキー取得（2行）
- `getRelationEndpoint()` [relation/apiEndpoint.js:21-51] ※エンドポイントURL生成（30行）

### データ取得・変換
- `getCaseCategoriesMap()` [slack/data-fetcher.js:94-145] ※チケット分類マップ取得（51行）
- `getLabelsMap()` [slack/data-fetcher.js:147-199] ※ラベルマップ取得（52行）
- `getCategoryNames()` [slack/data-fetcher.js:201-217] ※分類名変換（16行）
- `getLabelNames()` [slack/data-fetcher.js:219-241] ※ラベル名変換（22行）
- `formatDate()` [slack/data-fetcher.js:243-247] ※日付フォーマット（4行）
- `parseDate()` [relation/fetchTickets.js:220-233] ※日付解析（13行）

### Slack通知
- `sendSlackToMunicipality()` [slack/notifications.js:144-169] ※自治体別Slack通知送信（25行）
- `applySlackNotificationFilter()` [slack/notifications.js:171-203] ※通知フィルタ適用（32行）
- `createSlackMessage()` [slack/message-builder.js:12-59] ※Slackメッセージ構築（47行）
- `sendWithBotToken()` [slack/notifications.js:40-79] ※Botトークン使用送信（39行）

---

## 📝 注意事項

1. **依存関係の順序**: `📮受信箱取得` は他の機能の前提となるため、最初に実行する必要があります。

2. **バッチ処理**: `🔄全データ更新` は内部で複数の関数を順次実行し、APIレート制限を考慮した待機処理を行います。

3. **定期通知**: トリガー設定により `executeScheduledNotifications()` が自動実行され、設定された時間に各自治体へ通知を送信します。

4. **エラーハンドリング**: 各関数は独自のエラーハンドリングを持ち、失敗した自治体を記録してバッチ処理を継続します。

5. **API制限対策**: 50自治体ごとに60秒の待機時間を設けて、re:lation APIのレート制限（60回/分）に対応しています。
