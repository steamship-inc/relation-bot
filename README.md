# relation-bot アーキテクチャ

リファクタリング完了後の最終的なディレクトリ構成とアーキテクチャ

## 📁 ディレクトリ構成

```
relation-bot/
├── docs/                        # ドキュメント
│   ├── architecture.md
│   └── refactoring.md
├── menu/                        # Google Apps Script UI
│   ├── menu.js                  # メニュー定義
│   ├── sidebar_manager.js       # サイドバー管理
│   └── slack_menu_wrapper.js    # Slackメニュー連携
├── relation/                    # re:lation API関連機能
│   ├── mainController.js        # メインエントリポイント
│   ├── businessLogic.js         # ビジネスロジック
│   ├── dataService.js           # データアクセス層
│   ├── apiHelpers.js            # API共通機能
│   ├── batchProcessor.js        # バッチ処理
│   ├── configOptimizer.js       # 設定最適化
│   ├── dataProcessors.js        # データ変換・フィルタ
│   ├── errorHandler.js          # エラーハンドリング
│   ├── municipalityManager.js   # 自治体設定管理
│   ├── qualityTools.js          # 品質管理ツール
│   ├── ticketDataConverter.js   # チケットデータ変換
│   ├── ticketOrchestrator.js    # メイン処理オーケストレーター
│   ├── config.js                # 基本設定
│   ├── constants.js             # 定数定義
│   └── ticket_detail_sidebar.html # チケット詳細UI
└── slack/                       # Slack関連機能
    ├── core.js                  # Slack核心機能
    ├── data.js                  # Slackデータ処理
    ├── message.js               # メッセージ処理
    ├── slackHelpers.js          # Slack通知ヘルパー
    ├── ui.js                    # Slack UI
    └── README.md                # Slack機能ドキュメント
```

## 🏗️ アーキテクチャ

### **レイヤー構成**

```
┌─────────────────────────────────────┐
│          UI Layer                   │  ← menu/
├─────────────────────────────────────┤
│      Controller Layer               │  ← relation/mainController.js
├─────────────────────────────────────┤
│      Service Layer                  │  ← relation/businessLogic.js
├─────────────────────────────────────┤
│      Data Access Layer              │  ← relation/dataService.js
├─────────────────────────────────────┤
│      Utility Layer                  │  ← relation/[utilities], slack/
└─────────────────────────────────────┘
```

### **責務分離**

- **`docs/`**: プロジェクトドキュメント
- **`menu/`**: Google Apps Script UI・メニューシステム
- **`relation/`**: re:lation API特化機能（メイン機能）
- **`slack/`**: Slack機能の完全分離

## 🔄 主要な改善

### **Before (リファクタリング前)**
- 565行の巨大なfetchTickets.js
- 重複コードが4つのファイルに散在
- relation機能とslack機能が混在
- エラーハンドリングが統一されていない

### **After (リファクタリング後)**
- ✅ 機能別に明確分離
- ✅ relation/slack でディレクトリ分離
- ✅ 単一責任原則の実現
- ✅ DRY原則の徹底
- ✅ 統一されたエラーハンドリング
- ✅ 構造化ログシステム
- ✅ 品質管理ツール内蔵

## 📝 主要関数

### **メインエントリポイント**
- `fetchOpenTickets()` - チケット取得
- `fetchCaseCategories()` - 分類取得
- `fetchLabels()` - ラベル取得
- `fetchMessageBoxes()` - メッセージボックス取得

### **診断・最適化**
- `systemDiagnostics()` - システム診断
- `advancedSystemCheck()` - 高度ヘルスチェック
- `generateConfigurationReport()` - 設定レポート生成

## 🚀 使用方法

### **新機能の実行**
```javascript
// メインのチケット取得
fetchOpenTickets();

// システム診断
advancedSystemCheck();

// 設定最適化レポート
var report = generateConfigurationReport();
console.log(report);
```

### **直接オーケストレーター呼び出し**
```javascript
// より詳細な制御が必要な場合
var summary = executeOpenTicketsFetch({
  enableNotifications: true,
  enableProgressDisplay: true,
  filters: { statuses: ['open', 'in_progress'] }
});
```

## ⚠️ 重要な注意事項

- **完全なクリーンアーキテクチャ**: レガシーコード完全除去済み
- **新しいディレクトリ構成**: relation/slack で機能完全分離
- **パス変更**: 新しいディレクトリ構成に合わせてimport/requireを更新
- **Slack機能**: `slack/`ディレクトリに完全分離

リファクタリング完了日: 2025年8月13日
