# 🟩 re:lation メニュー シーケンス

このファイルでは、re:lationメニューに含まれる機能のシーケンス図を解説します。

## 1. 全自治体 openチケット取得
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant FT as fetchTickets.js
    participant MC as municipality_config.js
    participant C as config.js
    participant API as re:lation API
    participant Notifications as slack/notifications.js
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
            FT->>Notifications: sendSlackToMunicipality()
            Notifications->>Notifications: applySlackNotificationFilter()
            Notifications->>Notifications: createSlackMessage()
            Notifications->>API: Slack通知送信
        end
        
        alt 50件バッチ完了
            FT->>Sheet: 一括データ書き込み
            FT->>FT: 60秒待機（レート制限対策）
        end
    end
    
    FT-->>UI: 処理完了・結果表示
    UI-->>User: 完了通知
```

## 2. メッセージボックス一覧取得
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant FMB as fetchMessageBoxes.js
    participant C as config.js
    participant API as re:lation API
    participant Sheet as シート

    User->>UI: 📮受信箱取得 選択
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

## 3. チケット分類一覧取得
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant FCC as fetchCaseCategories.js
    participant C as config.js
    participant API as re:lation API
    participant Sheet as シート

    User->>UI: 🗂️チケット分類取得 選択
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

## 4. ラベル一覧取得
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant FL as fetchLabels.js
    participant C as config.js
    participant API as re:lation API
    participant Sheet as シート

    User->>UI: 🏷️ラベル取得 選択
    UI->>FL: fetchLabels()
    FL->>C: buildLabelsUrl()
    C-->>FL: API URL
    FL->>API: ラベル一覧取得
    API-->>FL: ラベルデータ
    FL->>Sheet: 🏷️ラベルシートに書き込み
    FL-->>UI: 処理完了
    UI-->>User: 完了通知
```

## 5. 全データ更新（バッチ処理）
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant Menu as menu.js
    participant FCC as fetchCaseCategories.js
    participant FL as fetchLabels.js
    participant FT as fetchTickets.js
    participant API as re:lation API
    participant Sheet as シート
    
    User->>UI: 🔄 全データ更新（順次実行）選択
    UI->>Menu: runDataUpdateBatch()
    Menu-->>UI: 確認ダイアログ表示
    UI-->>User: 実行確認
    User->>UI: 実行承認
    
    %% 1. チケット分類取得
    Menu->>FCC: fetchCaseCategories()
    FCC->>API: チケット分類一覧取得
    API-->>FCC: 分類データ
    FCC->>Sheet: 🏷️チケット分類シートに書き込み
    
    %% 2. ラベル取得
    Menu->>FL: fetchLabels()
    FL->>API: ラベル一覧取得
    API-->>FL: ラベルデータ
    FL->>Sheet: 🏷️ラベルシートに書き込み
    
    %% 3. 未対応チケット取得
    Menu->>FT: fetchOpenTickets()
    Note over FT: 全自治体チケット取得<br/>（シーケンス1と同様）
    
    Menu-->>UI: 処理完了通知
    UI-->>User: 完了ダイアログ
```

## 9. Slack自動通知（チケット取得時）- 現在コメントアウト
```mermaid
sequenceDiagram
    participant FT as fetchTickets.js
    participant Notifications as slack/notifications.js
    participant DataFetcher as slack/data-fetcher.js
    participant MessageBuilder as slack/message-builder.js
    participant Slack as Slack API

    %% 全自治体チケット取得中の通知フロー
    FT->>FT: fetchOpenTickets()処理中
    
    loop 各自治体（50件バッチ）
        Note over FT: チケット取得完了
        
        %% ※※※現在この処理はコメントアウトされています※※※
        Note over FT: 現在この機能はコメントアウトされています
        Note over FT: fetchTickets.js内のSlack通知呼び出し部分が無効化
        
        alt Slackチャンネル設定あり（コメントアウト）
            FT-->>Notifications: [非アクティブ] sendSlackToMunicipality(tickets, config, isLast)
            Notifications-->>Notifications: [非アクティブ] applySlackNotificationFilter(tickets, config)
            Note over Notifications: フィルタ条件適用<br/>- include_label_ids<br/>- include_case_category_ids<br/>- priority_levels
            
            alt フィルタ条件該当チケットあり
                Notifications-->>MessageBuilder: [非アクティブ] createSlackMessage(filteredTickets, config)
                MessageBuilder-->>MessageBuilder: テンプレート適用・URL生成
                MessageBuilder-->>Notifications: フォーマット済みメッセージ
                Notifications-->>Slack: [非アクティブ] POST chat.postMessage<br/>(Bot Token + レート制限対応)
                Slack-->>Notifications: 送信結果
                
                alt 最後の送信でない
                    Notifications-->>Notifications: Utilities.sleep(1500)<br/>(レート制限回避)
                end
            else フィルタ条件該当なし
                Notifications-->>Notifications: 送信スキップ
                Notifications-->>Notifications: Utilities.sleep(1500)<br/>(待機時間統一)
            end
        end
        
        alt 50自治体バッチ完了
            FT->>FT: Utilities.sleep(60000)<br/>(API制限回避)
        end
    end
```
