# アーカイブファイル

このフォルダには、リファクタリング完了により不要となったレガシーファイルが保存されています。

## アーカイブされたファイル

### 元の巨大ファイル群
- `fetchTickets.js` (565行) → `utils/ticketOrchestrator.js` + `controllers/mainController.js` に分割
- `fetchCaseCategories.js` → `services/businessLogic.js` に統合
- `fetchLabels.js` → `services/businessLogic.js` に統合  
- `fetchMessageBoxes.js` → `services/businessLogic.js` に統合
- `municipality_config.js` (294行) → `utils/municipalityManager.js` に移行

### リファクタリング中間ファイル群
- `fetchTickets_refactored.js`
- `fetchCaseCategories_refactored.js`
- `fetchLabels_refactored.js`
- `fetchMessageBoxes_refactored.js`

## 新しいアーキテクチャ

これらのファイルの機能は以下の新しいモジュール構成に移行されました：

### コントローラー層
- `controllers/mainController.js` - メニューから呼び出される統一エントリポイント

### サービス層  
- `services/dataService.js` - データアクセス層
- `services/businessLogic.js` - ビジネスロジック層

### ユーティリティ層
- `utils/ticketOrchestrator.js` - チケット取得の完全ワークフロー
- `utils/apiHelpers.js` - API関連の共通機能
- `utils/dataProcessors.js` - データ変換・フィルタリング
- `utils/slackHelpers.js` - Slack通知システム
- `utils/municipalityManager.js` - 自治体設定管理
- `utils/batchProcessor.js` - バッチ処理統合
- `utils/configOptimizer.js` - 設定最適化
- `utils/qualityTools.js` - 品質管理ツール

## リファクタリング完了日
2025年8月13日

## 注意事項
- これらのファイルは参考用として保持していますが、新しいコードでは使用しないでください
- 機能は新しいアーキテクチャに完全に移行済みです
- `fetchTickets_legacy.js` のみルートディレクトリに残し、下位互換性を提供しています
