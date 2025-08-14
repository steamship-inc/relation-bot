# チケットビューアー (ticket-viewer)

このディレクトリは、re:lationのチケット詳細を表示するUIモジュールです。

## 処理シーケンス

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Menu as メニュー
    participant Modal as モーダル画面
    participant GAS as Google Apps Script
    participant Sheet as スプレッドシート
    participant API as re:lation API
    
    %% 初期化フロー
    User->>Menu: 📋 詳細ページで表示 クリック
    Menu->>GAS: openTicketDetailPage()
    GAS->>Modal: HTMLモーダル表示
    Modal->>GAS: loadMunicipalitiesFromOpenTicketSheet()
    GAS->>Sheet: 🎫未対応チケット読み込み
    Sheet-->>GAS: 自治体リスト
    GAS-->>Modal: 自治体データ返却
    Modal->>Modal: 自治体セレクトボックス表示
    
    %% チケット一覧取得フロー
    User->>Modal: 自治体選択
    Modal->>GAS: fetchTicketList(messageBoxId)
    GAS->>API: POST /api/v2/{messageBoxId}/tickets/search
    Note over API: DEFAULT_SEARCH_CONDITIONS<br/>- status_cds: ["open"]<br/>- per_page: 50<br/>- page: 1
    API-->>GAS: チケット一覧データ
    
    loop チケット毎にタイトル取得
        GAS->>Sheet: getTicketTitleFromSheet(ticketId)
        Sheet-->>GAS: チケットタイトル
    end
    
    GAS-->>Modal: チケット一覧（タイトル付き）
    Modal->>Modal: チケットセレクトボックス表示
    
    %% チケット詳細表示フロー
    User->>Modal: チケット選択
    Modal->>GAS: fetchTicketDetailWithSheetTitle(messageBoxId, ticketId)
    GAS->>API: GET /api/v2/{messageBoxId}/tickets/{ticketId}
    API-->>GAS: チケット詳細データ
    GAS->>Sheet: getTicketTitleFromSheet(ticketId)
    Sheet-->>GAS: シートからタイトル取得
    GAS->>GAS: タイトル上書き処理
    GAS-->>Modal: チケット詳細（シートタイトル付き）
    Modal->>Modal: チケット詳細表示
    Modal->>Modal: re:lationリンク生成
    
    %% 外部リンク
    User->>Modal: 🔗 re:lationで開く クリック
    Modal->>API: 新しいタブでre:lation開く
```

## データソースとAPI

### スプレッドシート
- **🎫未対応チケット**: 自治体一覧とチケットタイトルの取得元
  - A列: 受信箱ID
  - B列: 自治体名  
  - C列: チケットID
  - D列: チケットタイトル

### re:lation API エンドポイント
- **チケット検索**: `POST /api/v2/{messageBoxId}/tickets/search`
  - チケット一覧の取得
  - 検索条件: `status_cds: ["open"], per_page: 50, page: 1`
  
- **チケット詳細**: `GET /api/v2/{messageBoxId}/tickets/{ticketId}`
  - 個別チケットの詳細情報とメッセージ履歴

### 主要関数
- `openTicketDetailPage()`: モーダルダイアログ表示
- `loadMunicipalitiesFromOpenTicketSheet()`: 自治体一覧取得
- `fetchTicketList(messageBoxId)`: チケット一覧取得
- `fetchTicketDetailWithSheetTitle()`: チケット詳細取得
- `getTicketTitleFromSheet(ticketId)`: シートからタイトル取得

## ディレクトリ構成

```
ticket-viewer/
├── README.md                              # ディレクトリ説明
├── viewer_manager.js                      # メイン管理モジュール
├── viewer_page.html                       # UI表示ページ
├── viewer_page_css.html                   # CSS スタイル
└── viewer_page_js.html                    # JavaScript ロジック
```
