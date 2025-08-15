# 🔔 Slack メニュー シーケンス

このファイルでは、Slackメニューに含まれる機能のシーケンス図を解説します。

## 目次
- [1. Slack手動送信](#1-slack手動送信)
- [2. Slackフィルタ設定](#2-slackフィルタ設定)
- [3. 定期通知トリガー管理](#3-定期通知トリガー管理)
- [4. 定期実行のSlack通知（スケジューラー）](#4-定期実行のslack通知スケジューラー)

## 1. Slack手動送信
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant Notifications as slack/notifications.js
    participant Dialogs as slack/dialogs.js
    participant DataFetcher as slack/data-fetcher.js
    participant MessageBuilder as slack/message-builder.js
    participant TicketSheet as 🎫未対応チケットシート
    participant Slack as Slack API

    User->>UI: 📤 Slack手動送信 選択
    UI->>Notifications: manualSendSlack()
    Notifications->>Notifications: SLACK_BOT_TOKEN確認
    Notifications->>TicketSheet: 🎫未対応チケットシート確認
    TicketSheet-->>Notifications: シート存在確認
    
    %% 自治体選択フロー
    Notifications->>Dialogs: selectMunicipalityWithSearchableDialog()
    Dialogs->>TicketSheet: 自治体設定読み込み<br/>(A列:受信箱ID, B列:自治体名)
    TicketSheet-->>Dialogs: 自治体リスト
    Dialogs-->>UI: 検索可能自治体選択UI表示
    UI-->>User: 自治体選択画面
    
    %% 自治体選択後の処理
    User->>UI: 自治体選択
    UI->>Notifications: processSelectedMunicipality(municipalityCode)
    Notifications->>DataFetcher: getTicketsFromSheet(messageBoxId)
    DataFetcher->>TicketSheet: 該当自治体チケット取得<br/>(A列:受信箱ID一致で検索)
    TicketSheet-->>DataFetcher: チケットデータ
    DataFetcher-->>Notifications: チケット配列
    
    alt チケット存在
        %% メッセージ作成・送信フロー
        Notifications->>MessageBuilder: createSlackMessage(tickets, config)
        MessageBuilder->>MessageBuilder: テンプレート適用・URL生成
        MessageBuilder-->>Notifications: フォーマット済みメッセージ
        Notifications->>Slack: POST chat.postMessage<br/>(Bot Token使用)
        Slack-->>Notifications: 送信結果
        Notifications-->>UI: 送信完了ログ
    else チケット無し
        Notifications-->>UI: 送信スキップ通知
    end
    
    UI-->>User: 処理結果表示
```

## 2. Slackフィルタ設定
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant FilterConfig as slack-filter-config.js
    participant Dialog as HTMLダイアログ
    participant Sheet as 📮受信箱シート
    
    User->>UI: 🔧 Slackフィルタ設定 選択
    UI->>FilterConfig: showFilterConfigDialog()
    FilterConfig->>Sheet: 自治体設定データ読み込み
    Sheet-->>FilterConfig: 設定データ
    FilterConfig->>FilterConfig: selectMunicipalityWithSearchableDialog()
    FilterConfig-->>UI: 検索可能な自治体選択ダイアログ表示
    UI-->>User: 自治体検索・選択
    
    User->>UI: 自治体選択
    UI->>FilterConfig: showFilterConfigHtmlDialog(messageBoxId, config)
    FilterConfig->>Dialog: HTMLダイアログ表示（現在設定の読み込み）
    Dialog-->>User: フィルタ設定編集画面
    
    User->>Dialog: フィルタ条件編集
    Dialog->>FilterConfig: saveSlackNotificationFilter(messageBoxId, filterConfig)
    FilterConfig->>Sheet: フィルタ設定を保存<br/>(Slack通知フィルタ列にJSON)
    Sheet-->>FilterConfig: 保存完了
    FilterConfig-->>Dialog: 保存結果表示
    Dialog-->>User: 完了通知
```

## 3. 定期通知トリガー管理
```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as スプレッドシートUI
    participant Scheduler as slack/scheduler.js
    participant Dialog as HTMLダイアログ
    participant GAS as Google Apps Script
    
    %% トリガー管理画面の表示
    User->>UI: ⚙️ 定期通知トリガー管理 選択
    UI->>Scheduler: manageScheduledNotificationTrigger()
    Scheduler->>Scheduler: getCurrentTriggerStatus()
    Scheduler->>GAS: ScriptApp.getProjectTriggers()
    GAS-->>Scheduler: 現在のトリガー情報
    Scheduler->>Dialog: HTMLダイアログ表示
    Dialog-->>User: トリガー管理画面表示
    
    %% 本番用トリガー設定
    alt 本番用設定選択
        User->>Dialog: 🟢 本番設定 クリック
        Dialog->>Scheduler: setupProductionTrigger()
        Scheduler->>GAS: 既存トリガー削除
        Scheduler->>GAS: 1時間ごとのトリガー作成
        GAS-->>Scheduler: トリガー作成完了
        Scheduler-->>Dialog: 設定完了応答
        Dialog-->>User: 完了メッセージ表示
    
    %% 検証用トリガー設定
    else 検証用設定選択
        User->>Dialog: 🔶 検証設定 クリック
        Dialog->>Scheduler: setupTestTrigger()
        Scheduler->>GAS: 既存トリガー削除
        Scheduler->>GAS: 1分ごとのトリガー作成
        GAS-->>Scheduler: トリガー作成完了
        Scheduler-->>Dialog: 設定完了応答
        Dialog-->>User: 完了メッセージ表示
    
    %% トリガー削除
    else トリガー削除選択
        User->>Dialog: 🗑️ 削除 クリック
        Dialog->>Scheduler: removeScheduledNotificationTrigger()
        Scheduler->>GAS: 既存トリガー削除
        GAS-->>Scheduler: 削除完了
        Scheduler-->>Dialog: 削除完了応答
        Dialog-->>User: 完了メッセージ表示
    end
```

## 4. 定期実行のSlack通知（スケジューラー）
```mermaid
sequenceDiagram
    participant Trigger as 時間トリガー
    participant Scheduler as slack/scheduler.js
    participant DataFetcher as slack/data-fetcher.js
    participant Notifications as slack/notifications.js
    participant MessageBuilder as slack/message-builder.js
    participant Sheet as 📮受信箱シート
    participant TicketSheet as 🎫未対応チケットシート
    participant Slack as Slack API
    
    %% 定期実行開始
    Trigger->>Scheduler: 1時間ごとに実行<br/>executeScheduledNotifications()
    Scheduler->>Scheduler: 現在の日時情報を取得<br/>（時刻・曜日・日付）
    
    %% 自治体設定取得
    Scheduler->>Sheet: loadMunicipalityConfigsFromSheet()
    Sheet-->>Scheduler: 自治体設定配列（定期通知設定含む）
    
    loop 各自治体
        Scheduler->>Scheduler: checkCronSchedule(cronSchedule, currentHour, ...)
        Note over Scheduler: cron設定と現在時刻を比較<br/>例: "9:00 daily"<br/>"14:30 weekdays"<br/>"10:00 mon,wed,fri"
        
        alt 実行条件一致
            Scheduler->>DataFetcher: getTicketsFromSheet(messageBoxId)
            DataFetcher->>TicketSheet: 該当自治体チケット取得<br/>(A列:受信箱ID一致で検索)
            TicketSheet-->>DataFetcher: チケットデータ
            DataFetcher-->>Scheduler: チケット配列
            
            alt チケット存在
                Scheduler->>Notifications: sendSlackToMunicipality(tickets, config, isLast)
                Notifications->>Notifications: applySlackNotificationFilter(tickets, config)
                Note over Notifications: フィルタ条件適用<br/>- include_label_ids<br/>- include_case_category_ids<br/>- priority_levels
                
                alt フィルタ条件該当チケットあり
                    Notifications->>MessageBuilder: createSlackMessage(filteredTickets, config)
                    MessageBuilder->>MessageBuilder: テンプレート適用・URL生成
                    MessageBuilder-->>Notifications: フォーマット済みメッセージ
                    Notifications->>Slack: POST chat.postMessage<br/>(Bot Token使用)
                    Slack-->>Notifications: 送信結果
                    Notifications-->>Scheduler: 完了通知
                else フィルタ条件該当なし
                    Notifications-->>Scheduler: 送信スキップ通知
                end
            end
        end
    end
    
    Scheduler->>Scheduler: 処理完了・ログ出力（実行時間・送信数）
```
