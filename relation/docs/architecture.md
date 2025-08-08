# アーキテクチャとファイル構成

## ファイル構成と関数構成

### config.js（グローバル設定管理）
```
config.js
├── グローバル変数
│   ├── RELATION_SUBDOMAIN (固定: 'steamship')
│   ├── RELATION_BASE_URL
│   └── COMMON_SEARCH_CONDITIONS (全自治体共通の検索条件)
├── 設定取得
│   ├── getCommonSearchConditions()
│   ├── getRelationBaseUrl()
│   └── getRelationApiKey()
└── URL構築
    ├── buildTicketSearchUrl(messageBoxId)
    ├── buildCaseCategoriesUrl(messageBoxId)
    ├── buildMessageBoxesUrl()
    └── buildTicketUrl(messageBoxId, ticketId, status)
```

### municipality_config.js（自治体設定管理）
```
municipality_config.js
├── 設定取得
│   ├── getMunicipalityConfig(municipalityId) - 個別自治体設定取得
│   ├── getAllMunicipalityConfigs() - 全自治体設定取得
│   └── loadMunicipalityConfigFromSheet() - シートから設定読み込み
├── JSON解析
│   └── parseSlackNotificationFilter(jsonString) - Slackフィルタ条件解析
└── 初期設定
    └── createMunicipalityConfigSheet() - 設定シート初期化
```

### fetchTickets.js（チケット取得・Slack通知統合）
```
fetchTickets.js
├── チケット取得
│   ├── fetchOpenTickets() - 全自治体チケット取得（メイン機能）
│   └── fetchTicketsForMunicipality(config, ticketType) - 個別自治体チケット取得
├── Slack通知
│   ├── sendSlackToMunicipality(config, tickets) - 自治体別Slack通知
│   └── applySlackNotificationFilter(tickets, config) - フィルタ条件適用
└── ユーティリティ
    └── findMunicipalityConfigByName(municipalityName, configs) - 自治体名で設定検索
```

### slack_notification.js（Slack通知専用）
```
slack_notification.js
├── 手動送信
│   ├── manualSendSlack() - UI付き手動送信
│   ├── selectMunicipalityWithSearchableDialog() - 自治体選択UI
│   └── processSelectedMunicipality(municipalityCode) - 選択処理
├── Slack送信
│   ├── sendSlack(tickets, config) - Slack通知送信
│   └── createSlackMessage(tickets, config) - Slackメッセージ構築
└── ユーティリティ
    └── formatDate(isoString) - 日時フォーマット
```

### fetchMessageBoxes.js（メッセージボックス取得）
```
fetchMessageBoxes.js
├── データ取得
│   └── fetchMessageBoxes() - メッセージボックス一覧取得・シート出力
└── ユーティリティ
    └── findMunicipalityInCodeTable(organizationName, codeTableMap) - 自治体特定
```

### fetchCaseCategories.js（チケット分類取得）
```
fetchCaseCategories.js
└── データ取得
    └── fetchCaseCategories() - チケット分類一覧取得・シート出力
```

### fetchLabels.js（ラベル取得）
```
fetchLabels.js
└── データ取得
    └── fetchLabels() - ラベル一覧取得・シート出力
```

### menu.js（メニュー構成）
```
menu.js
└── UI構成
    └── onOpen() - スプレッドシート起動時メニュー作成
        ├── re:lationメニュー
        │   ├── 全自治体 openチケット取得
        │   ├── メッセージボックス一覧取得
        │   └── チケット分類一覧取得
        ├── Slack通知メニュー
        │   ├── シートからSlack通知
        │   └── Slack通知テスト
        └── 自治体管理メニュー
            └── 設定シート初期化
```

## データフロー

### 全自治体チケット一括取得フロー
```mermaid
graph TB
    A[スプレッドシート起動] --> B[onOpen: メニュー表示]
    B --> C[🎫未対応チケット取得 選択]
    C --> D[fetchOpenTickets実行]
    
    D --> E[📮受信箱シートから設定読み込み]
    E --> F[🎫未対応チケットシート初期化]
    
    F --> G[各自治体を50件バッチで処理]
    G --> H[re:lation API呼び出し]
    H --> I[チケット分類・ラベル名変換]
    I --> J[シートにデータ蓄積]
    
    J --> K{Slackチャンネル設定あり?}
    K -->|Yes| L[Slack通知送信]
    K -->|No| M[次の自治体へ]
    L --> M
    
    M --> N{50件バッチ完了?}
    N -->|Yes| O[一括データ書き込み]
    N -->|No| G
    O --> P[60秒待機（レート制限対策）]
    P --> Q{全自治体完了?}
    Q -->|No| G
    Q -->|Yes| R[処理完了・結果表示]
```

### Slack手動通知フロー
```mermaid
graph TB
    A[🔔Slack手動送信 選択] --> B[manualSendSlack実行]
    B --> C[SLACK_BOT_TOKEN確認]
    C --> D[🎫未対応チケットシート確認]
    D --> E[検索可能自治体選択UI表示]
    
    E --> F[ユーザーが自治体選択]
    F --> G[該当自治体のチケットをシートから取得]
    
    G --> H{チケット存在?}
    H -->|Yes| I[Slackメッセージ作成]
    H -->|No| J[送信スキップ通知]
    
    I --> K[Slack通知送信]
    K --> L[送信完了ログ出力]
```

## アーキテクチャ特徴

### レイヤー構造
- **UI層**: menu.js（メニュー構成）
- **制御層**: fetchTickets.js, slack_notification.js（業務ロジック）
- **データアクセス層**: config.js, municipality_config.js（設定管理）
- **外部API層**: re:lation API, Slack API（外部連携）

### 設計パターン
- **設定分離**: スプレッドシートベースの設定管理
- **バッチ処理**: レート制限対応の50件バッチ処理
- **エラーハンドリング**: 個別自治体のエラーが全体に影響しない設計
- **拡張性**: 新自治体追加時の設定追加のみでの対応

### パフォーマンス特性
- **レート制限対策**: 50件ごとに60秒待機
- **バッチ書き込み**: 配列蓄積による一括SpreadsheetApp操作
- **進捗表示**: リアルタイムの処理状況表示
