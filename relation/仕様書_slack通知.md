# Slack通知機能

re:lationチケット情報をSlackに通知するための機能です。

## ファイル構成

- `slack_notification.js` - Slack通知機能の実装
- `get_ticket.js` - チケット取得機能（Slack通知呼び出し含む）

## 機能

### 自動通知
- `fetchOpenTickets()` 実行時に未対応チケットの状況をSlackに自動通知

### 手動通知(テスト用)
- メニューから「Slack通知テスト」を実行してテストメッセージを送信

## セットアップ

1. Google Apps Scriptのスクリプトプロパティに以下を設定：
   - `SLACK_WEBHOOK_URL`: Slack Incoming WebhookのURL
   - `RELATION_API_KEY`: re:lation APIキー

2. Slack Webhook URLの形式：
   ```
   https://hooks.slack.com/services/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
   ```
   - T6C6YQR62: SlackワークスペースID
   - B0976DF0Q22: Webhook専用ID
   - mKQM6tPJZDp5a5vtCCFEi7kL: 認証用トークン

## API関数

### sendSlack(tickets)
チケット配列を受け取ってSlack通知を送信

**パラメータ:**
- `tickets`: チケット情報の配列

**使用例:**
```javascript
var tickets = [
  {
    ticket_id: 12345,
    title: "サンプルチケット",
    created_at: "2024-01-01T10:00:00Z",
    last_updated_at: "2024-01-01T15:00:00Z"
  }
];
sendSlack(tickets);
```

### sendCustomSlackMessage(message, channel)
カスタムメッセージをSlackに送信

**パラメータ:**
- `message`: 送信するメッセージ
- `channel`: 送信先チャンネル（オプション）

**使用例:**
```javascript
sendCustomSlackMessage("テストメッセージです");
```

### createSlackMessage(tickets)
チケット情報からSlack用のメッセージを生成

**パラメータ:**
- `tickets`: チケット情報の配列

**戻り値:**
- フォーマットされたSlackメッセージ文字列

### formatDate(isoString)
ISO8601形式の日時をMM/dd HH:mm形式にフォーマット

**パラメータ:**
- `isoString`: ISO8601形式の日時文字列

**戻り値:**
- フォーマットされた日時文字列

## 通知内容

通知メッセージには以下の情報が含まれます：

- 未対応チケット数
- 最新5件のチケット詳細（ID、タイトル、作成日、更新日）
- チケットへの直接リンク
- スプレッドシートへの案内

## エラーハンドリング

- Webhook URLが設定されていない場合：コンソールにログ出力
- 通信エラー時：コンソールにエラーログ出力
- メニューからのテスト実行時：UI上にエラーダイアログ表示

