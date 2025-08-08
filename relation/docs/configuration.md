# 設定ファイルの詳細

## 設定項目一覧

### 📮受信箱シート設定項目

| 列名 | 型 | 必須 | 説明 | 例 |
|---|---|---|---|---|
| 自治体ID | 文字列 | ○ | 自治体識別子 | `yamaga` |
| 自治体名 | 文字列 | ○ | 表示用自治体名 | `山鹿市` |
| 都道府県 | 文字列 | ○ | 所在都道府県 | `熊本県` |
| 受信箱ID | 数値 | ○ | re:lationメッセージボックスID | `12345` |
| 組織名 | 文字列 | - | re:lation上の組織名 | `山鹿市役所` |
| Slackチャンネル | 文字列 | △ | 通知先Slackチャンネル | `#yamaga-tickets` |
| 通知有効フラグ | ブール値 | △ | Slack通知の有効/無効 | `TRUE` |
| チケット検索条件(JSON) | JSON文字列 | △ | 検索条件設定 | 後述参照 |
| Slack通知テンプレート(JSON) | JSON文字列 | △ | 通知テンプレート | 後述参照 |

## チケット検索条件詳細

### 基本構造

```json
{
  "openTickets": {
    "status_cds": ["open"],
    "per_page": 100,
    "page": 1
  }
}
```

### 設定可能パラメータ

#### status_cds（ステータス指定）
チケットのステータスを配列で指定

| 値 | 説明 |
|---|---|
| `"open"` | 未対応チケット |
| `"in_progress"` | 対応中チケット |
| `"closed"` | 完了チケット |
| `"pending"` | 保留チケット |

**例**: 未対応と対応中のチケットを取得
```json
{
  "openTickets": {
    "status_cds": ["open", "in_progress"]
  }
}
```

#### per_page（取得件数）
1回のAPI呼び出しで取得するチケット数

| 値 | 説明 |
|---|---|
| 1-1000 | 取得件数（推奨: 50-100） |

#### page（ページ番号）
取得するページ番号（通常は1を指定）

#### date_range（期間指定）
作成日・更新日による期間フィルタ

```json
{
  "openTickets": {
    "status_cds": ["open"],
    "date_range": {
      "start": 7,  // 7日前から
      "end": 0     // 現在まで
    }
  }
}
```

#### case_category_ids（分類指定）
特定のチケット分類のみを取得

```json
{
  "openTickets": {
    "status_cds": ["open"],
    "case_category_ids": [101, 102, 103]
  }
}
```

#### label_ids（ラベル指定）
特定のラベルが付いたチケットのみを取得

```json
{
  "openTickets": {
    "status_cds": ["open"],
    "label_ids": [201, 202]
  }
}
```

### 設定例集

#### 基本設定（未対応チケットのみ）
```json
{
  "openTickets": {
    "status_cds": ["open"],
    "per_page": 100,
    "page": 1
  }
}
```

#### 期間限定設定（過去7日間の未対応チケット）
```json
{
  "openTickets": {
    "status_cds": ["open"],
    "per_page": 100,
    "page": 1,
    "date_range": { "start": 7, "end": 0 }
  }
}
```

#### 複数ステータス設定
```json
{
  "openTickets": {
    "status_cds": ["open", "in_progress"],
    "per_page": 100,
    "page": 1
  },
  "closedTickets": {
    "status_cds": ["closed"],
    "per_page": 30,
    "date_range": { "start": 3, "end": 0 }
  }
}
```

#### 分類特化設定（道路・公園関連のみ）
```json
{
  "openTickets": {
    "status_cds": ["open"],
    "per_page": 50,
    "case_category_ids": [101, 102, 105]
  }
}
```

## Slack通知テンプレート詳細

### 基本構造

```json
{
  "headerTemplate": "🎫 *{municipalityName} - 未対応チケット状況報告*\n\n📊 未対応チケット数: *{totalCount}件*\n\n",
  "ticketListHeader": "📋 *最新チケット（上位{displayCount}件）:*\n",
  "ticketItemTemplate": "• <{ticketUrl}|#{ticketId}> {title}\n  作成: {createdAt} | 更新: {updatedAt}\n",
  "remainingTicketsMessage": "\n... 他 {remainingCount}件のチケットがあります\n",
  "footerMessage": "\n💡 詳細はスプレッドシートをご確認ください",
  "noTicketsMessage": "✅ {municipalityName} - 未対応チケットはありません！",
  "maxDisplayCount": 5
}
```

### テンプレート項目

#### headerTemplate
通知メッセージのヘッダー部分

**利用可能変数**:
- `{municipalityName}`: 自治体名
- `{totalCount}`: 未対応チケット総数

#### ticketListHeader
チケット一覧のヘッダー部分

**利用可能変数**:
- `{displayCount}`: 表示チケット件数

#### ticketItemTemplate
個別チケットの表示テンプレート

**利用可能変数**:
- `{ticketUrl}`: チケット詳細ページURL
- `{ticketId}`: チケットID
- `{title}`: チケットタイトル
- `{createdAt}`: 作成日時（MM/dd HH:mm形式）
- `{updatedAt}`: 更新日時（MM/dd HH:mm形式）

#### remainingTicketsMessage
残りチケット数の表示メッセージ

**利用可能変数**:
- `{remainingCount}`: 残りチケット件数

#### footerMessage
通知メッセージのフッター部分

#### noTicketsMessage
チケットが0件の場合のメッセージ

**利用可能変数**:
- `{municipalityName}`: 自治体名

#### maxDisplayCount
表示する最大チケット件数（数値）

### テンプレート例集

#### シンプル版
```json
{
  "headerTemplate": "🔔 {municipalityName}のチケット状況\n未対応: {totalCount}件\n\n",
  "ticketListHeader": "最新{displayCount}件:\n",
  "ticketItemTemplate": "#{ticketId}: {title}\n",
  "footerMessage": "\n詳細確認→スプレッドシート",
  "noTicketsMessage": "✅ {municipalityName}: 未対応チケットなし",
  "maxDisplayCount": 3
}
```

#### 詳細版
```json
{
  "headerTemplate": "🚨 【{municipalityName}】緊急チケット状況レポート 🚨\n\n📈 未処理チケット総数: **{totalCount}件**\n⚠️ 対応が必要です\n\n",
  "ticketListHeader": "🔥 **優先対応チケット（上位{displayCount}件）**\n",
  "ticketItemTemplate": "🎫 <{ticketUrl}|チケット#{ticketId}>\n📝 **{title}**\n📅 登録: {createdAt} / 最終更新: {updatedAt}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  "remainingTicketsMessage": "\n📊 **追加対応待ち: {remainingCount}件**\n全件確認が必要です！\n",
  "footerMessage": "\n🔗 **詳細確認・対応状況更新**\n👉 スプレッドシートで全件確認してください\n📞 緊急時は直接連絡をお願いします",
  "noTicketsMessage": "🎉 **{municipalityName}** 🎉\n✨ 未対応チケットはありません！\n👏 お疲れ様でした",
  "maxDisplayCount": 8
}
```

#### 部署別カスタム版
```json
{
  "headerTemplate": "【市民課】{municipalityName} チケット状況\n対応待ち: {totalCount}件\n\n",
  "ticketListHeader": "本日の処理対象（{displayCount}件）:\n",
  "ticketItemTemplate": "No.{ticketId} {title} (更新:{updatedAt})\n",
  "remainingTicketsMessage": "\n※他{remainingCount}件は明日以降対応予定\n",
  "footerMessage": "\n処理完了後は市民課まで報告してください",
  "noTicketsMessage": "市民課: {municipalityName}の本日分は完了です",
  "maxDisplayCount": 10
}
```

## 設定変更ベストプラクティス

### JSON編集時の注意点
1. **構文チェック**: JSON構文の正確性を確認
2. **エスケープ文字**: 改行は`\n`、引用符は`\"`を使用
3. **テスト実行**: 変更後は必ずテスト実行で動作確認

### パフォーマンス考慮
1. **per_page**: 適切な件数設定（推奨: 50-100）
2. **条件絞り込み**: 不要なデータの取得を避ける
3. **maxDisplayCount**: 適切な表示件数設定（推奨: 3-10）

### 運用管理
1. **設定履歴**: 変更履歴の記録・管理
2. **バックアップ**: 重要な設定のバックアップ保存
3. **共有**: 設定変更の関係者への共有
