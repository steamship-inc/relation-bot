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

## データフロー（メニュー別シーケンス）

### 1. 全自治体 openチケット取得
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant FT as fetchTickets.js
    participant MC as municipality_config.js
    participant C as config.js
    participant API as re:lation API
    participant SN as slack_notification.js
    participant Sheet as シート

    User->>UI: 🎫未対応チケット取得 選択
    UI->>FT: fetchOpenTickets()
    FT->>MC: loadMunicipalityConfigFromSheet()
    MC->>Sheet: 📮受信箱シート読み込み
    Sheet-->>MC: 自治体設定データ
    MC-->>FT: 全自治体設定
    
    FT->>Sheet: 🎫未対応チケットシート初期化
    
    loop 各自治体（50件バッチ）
        FT->>C: buildTicketSearchUrl()
        C-->>FT: API URL
        FT->>API: チケット検索リクエスト
        API-->>FT: チケットデータ
        FT->>FT: チケット分類・ラベル名変換
        FT->>FT: データ蓄積（メモリ）
        
        alt Slackチャンネル設定あり
            FT->>SN: sendSlackToMunicipality()
            SN->>SN: applySlackNotificationFilter()
            SN->>SN: createSlackMessage()
            SN->>API: Slack通知送信
        end
        
        alt 50件バッチ完了
            FT->>Sheet: 一括データ書き込み
            FT->>FT: 60秒待機（レート制限対策）
        end
    end
    
    FT-->>UI: 処理完了・結果表示
    UI-->>User: 完了通知
```

### 2. メッセージボックス一覧取得
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant FMB as fetchMessageBoxes.js
    participant C as config.js
    participant API as re:lation API
    participant Sheet as シート

    User->>UI: メッセージボックス一覧取得 選択
    UI->>FMB: fetchMessageBoxes()
    FMB->>C: buildMessageBoxesUrl()
    C-->>FMB: API URL
    FMB->>API: メッセージボックス一覧取得
    API-->>FMB: メッセージボックスデータ
    FMB->>FMB: 自治体名マッピング処理
    FMB->>Sheet: 📮受信箱シートに書き込み
    FMB-->>UI: 処理完了
    UI-->>User: 完了通知
```

### 3. チケット分類一覧取得
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant FCC as fetchCaseCategories.js
    participant C as config.js
    participant API as re:lation API
    participant Sheet as シート

    User->>UI: チケット分類一覧取得 選択
    UI->>FCC: fetchCaseCategories()
    
    loop 各メッセージボックス
        FCC->>C: buildCaseCategoriesUrl()
        C-->>FCC: API URL
        FCC->>API: チケット分類取得
        API-->>FCC: 分類データ
    end
    
    FCC->>Sheet: 🏷️チケット分類シートに書き込み
    FCC-->>UI: 処理完了
    UI-->>User: 完了通知
```

### 4. シートからSlack通知
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant SN as slack_notification.js
    participant Sheet as シート
    participant Slack as Slack API

    User->>UI: 🔔シートからSlack通知 選択
    UI->>SN: manualSendSlack()
    SN->>SN: SLACK_BOT_TOKEN確認
    SN->>Sheet: 🎫未対応チケットシート確認
    Sheet-->>SN: シート存在確認
    SN->>SN: selectMunicipalityWithSearchableDialog()
    SN-->>UI: 検索可能自治体選択UI表示
    UI-->>User: 自治体選択画面
    
    User->>UI: 自治体選択
    UI->>SN: processSelectedMunicipality()
    SN->>Sheet: 該当自治体チケット取得
    Sheet-->>SN: チケットデータ
    
    alt チケット存在
        SN->>SN: createSlackMessage()
        SN->>Slack: Slack通知送信
        Slack-->>SN: 送信結果
        SN-->>UI: 送信完了ログ
    else チケット無し
        SN-->>UI: 送信スキップ通知
    end
    
    UI-->>User: 処理結果表示
```

### 5. Slack通知テスト
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant SN as slack_notification.js
    participant Slack as Slack API

    User->>UI: Slack通知テスト 選択
    UI->>SN: sendSlack()（テスト用ダミーデータ）
    SN->>SN: createSlackMessage()
    SN->>Slack: テスト通知送信
    Slack-->>SN: 送信結果
    SN-->>UI: テスト結果表示
    UI-->>User: テスト完了通知
```

### 6. 設定シート初期化
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant MC as municipality_config.js
    participant Sheet as シート

    User->>UI: 設定シート初期化 選択
    UI->>MC: createMunicipalityConfigSheet()
    MC->>Sheet: 📮受信箱シート作成
    MC->>Sheet: ヘッダー行設定
    MC->>Sheet: サンプルデータ挿入
    MC-->>UI: 初期化完了
    UI-->>User: 完了通知
```

