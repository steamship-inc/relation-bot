# リファクタリング履歴と提案

## 実施済みリファクタリング

### 2025年8月8日: Slack通知システムの大規模リファクタリング

#### 問題
- `slack_notification.js` が1200行を超える巨大ファイルになっていた
- 機能が混在し、メンテナンスが困難
- AIによる理解・支援が困難
- 複数人での同時開発が困難

#### 解決策: モジュール分割による責任分離

##### 新しいファイル構造
```
slack/
├── core.js      # メイン送信ロジックとAPI通信 (200行)
├── message.js   # メッセージ作成とテンプレート管理 (100行)
├── ui.js        # ユーザーインターフェース (350行)
├── data.js      # データ取得とマッピング (300行)
└── README.md    # 分割システムの詳細ドキュメント
```

##### 分割の基準
1. **単一責任の原則**: 各ファイルが1つの明確な責任を持つ
2. **機能的結合**: 関連する機能をまとめる
3. **依存関係の最小化**: ファイル間の依存を減らす
4. **再利用性**: 独立して利用可能な単位に分割

##### 成果
- **1200行→各300行以下**: ファイルサイズ大幅削減
- **機能分離**: 4つの明確な責任領域
- **ドキュメント化**: 各ファイルの役割と使用方法を明文化
- **AI支援向上**: 小さなファイルによる正確な支援が可能

詳細は `slack/README.md` を参照してください。

---

## 提案中のリファクタリング

現在のコードベースの改善提案です。段階的な実装により、保守性・拡張性・パフォーマンスの向上を目指します。

## 改善領域の優先順位

### 高優先度（即座に対応推奨）

#### 1. コード重複の解消

**現状の問題**:
- `fetchTickets.js`, `fetchMessageBoxes.js`, `fetchCaseCategories.js`, `fetchLabels.js`で類似処理が重複
- バッチ処理ロジックが各ファイルで個別実装
- 進捗表示・エラーハンドリングが散在

**改善案**:
```javascript
// 新規ファイル: utils/batchProcessor.js
function createBatchProcessor(options) {
  var batchSize = options.batchSize || 50;
  var waitTime = options.waitTime || 60000;
  var progressCell = options.progressCell;
  
  return {
    process: function(items, processingFunction) {
      var results = [];
      var totalBatches = Math.ceil(items.length / batchSize);
      
      for (var i = 0; i < items.length; i += batchSize) {
        var batch = items.slice(i, i + batchSize);
        var batchResults = processingFunction(batch);
        results = results.concat(batchResults);
        
        var currentBatch = Math.floor(i / batchSize) + 1;
        updateProgress(progressCell, currentBatch, totalBatches);
        
        if (currentBatch < totalBatches) {
          Utilities.sleep(waitTime);
        }
      }
      
      return results;
    }
  };
}
```

#### 2. 定数管理の統一

**現状の問題**:
- マジックナンバー（50, 60000等）がハードコード
- シート名が各ファイルで個別定義
- API URLの構築ロジックが分散

**改善案**:
```javascript
// 新規ファイル: constants.js
var CONSTANTS = {
  BATCH_SIZE: 50,
  RATE_LIMIT_WAIT: 60000,
  MAX_DISPLAY_TICKETS: 5,
  
  SHEET_NAMES: {
    MESSAGE_BOXES: '📮受信箱',
    OPEN_TICKETS: '🎫未対応チケット',
    CASE_CATEGORIES: '🏷️チケット分類',
    LABELS: '🏷️ラベル'
  },
  
  COLUMNS: {
    MESSAGE_BOXES: {
      MUNICIPALITY_ID: 0,
      MUNICIPALITY_NAME: 1,
      PREFECTURE: 2,
      MESSAGE_BOX_ID: 3,
      SLACK_CHANNEL: 5,
      NOTIFICATION_ENABLED: 6
    }
  }
};
```

#### 3. エラーハンドリングの統一

**現状の問題**:
- エラー処理が各関数で異なる
- ユーザーへの通知方法が統一されていない
- ログ出力形式がバラバラ

**改善案**:
```javascript
// 新規ファイル: utils/errorHandler.js
var ErrorHandler = {
  handle: function(error, context, userFriendlyMessage) {
    var errorInfo = {
      timestamp: new Date(),
      context: context,
      error: error.toString(),
      stack: error.stack
    };
    
    console.error('Error in ' + context + ':', errorInfo);
    
    if (userFriendlyMessage) {
      Browser.msgBox('エラー', userFriendlyMessage, Browser.Buttons.OK);
    }
    
    return errorInfo;
  },
  
  wrapFunction: function(func, context, userMessage) {
    return function() {
      try {
        return func.apply(this, arguments);
      } catch (error) {
        return ErrorHandler.handle(error, context, userMessage);
      }
    };
  }
};
```

### 中優先度（段階的に対応）

#### 4. パフォーマンス最適化

**現状の問題**:
- `SpreadsheetApp.flush()`の頻繁な呼び出し
- 個別セルへの書き込みが多い
- 配列操作の非効率性

**改善案**:
```javascript
// 新規ファイル: utils/spreadsheetOptimizer.js
var SpreadsheetOptimizer = {
  batchWrite: function(sheet, data, startRow, startCol) {
    if (data.length === 0) return;
    
    var range = sheet.getRange(startRow, startCol, data.length, data[0].length);
    range.setValues(data);
  },
  
  updateProgress: function(sheet, progressData) {
    // 進捗更新を配列操作で最適化
    var progressRange = sheet.getRange('A1:B1');
    progressRange.setValues([[progressData.message, progressData.percentage]]);
  }
};
```

#### 5. 関数の責任分離

**現状の問題**:
- `fetchOpenTickets()`が複数の責任を持つ（取得・変換・通知・書き込み）
- 単一責任原則に違反
- テストが困難

**改善案**:
```javascript
// 責任を分離した設計
var TicketService = {
  fetch: function(config) {
    // チケット取得のみに集中
  },
  
  transform: function(tickets, categoryMap, labelMap) {
    // データ変換のみに集中
  },
  
  store: function(tickets, sheet) {
    // データ保存のみに集中
  }
};

var NotificationService = {
  send: function(tickets, config) {
    // 通知送信のみに集中
  }
};
```

### 低優先度（将来対応）

#### 6. 型安全性の向上

**改善案**:
```javascript
// JSDocによる型注釈の追加
/**
 * チケットを取得する
 * @param {MunicipalityConfig} config 自治体設定
 * @param {string} ticketType チケットタイプ
 * @returns {Array<Ticket>} チケット配列
 */
function fetchTicketsForMunicipality(config, ticketType) {
  // 実装
}

/**
 * @typedef {Object} MunicipalityConfig
 * @property {string} municipalityId 自治体ID
 * @property {string} municipalityName 自治体名
 * @property {number} messageBoxId メッセージボックスID
 * @property {string} slackChannel Slackチャンネル
 */

/**
 * @typedef {Object} Ticket
 * @property {number} id チケットID
 * @property {string} title タイトル
 * @property {string} status ステータス
 * @property {Date} createdAt 作成日時
 */
```

#### 7. テスタビリティの向上

**改善案**:
```javascript
// 依存性注入パターンの導入
function createTicketService(dependencies) {
  var spreadsheetService = dependencies.spreadsheetService || SpreadsheetApp;
  var urlFetchService = dependencies.urlFetchService || UrlFetchApp;
  var propertiesService = dependencies.propertiesService || PropertiesService;
  
  return {
    fetchTickets: function(config) {
      // 注入された依存関係を使用
      var apiKey = propertiesService.getScriptProperties().getProperty('RELATION_API_KEY');
      var response = urlFetchService.fetch(buildApiUrl(config), {
        headers: { 'Authorization': 'Bearer ' + apiKey }
      });
      return JSON.parse(response.getContentText());
    }
  };
}
```

## 実装優先度とスケジュール

### フェーズ1: 基盤整備（1-2週間）
**目標**: コードの安定性向上
1. **定数管理統一**: `constants.js`作成
2. **共通ユーティリティ**: `utils/`ディレクトリ作成
3. **エラーハンドリング統一**: 全関数への適用

**期待効果**:
- バグ減少
- 保守性向上
- 開発効率改善

### フェーズ2: 機能改善（2-3週間）
**目標**: パフォーマンス・可読性向上
1. **バッチ処理共通化**: 重複コード削除
2. **関数責任分離**: 単一責任原則適用
3. **SpreadsheetApp最適化**: 書き込み効率化

**期待効果**:
- 処理時間短縮
- コード可読性向上
- 機能追加の容易さ

### フェーズ3: 品質向上（1-2週間）
**目標**: 長期保守性確保
1. **型注釈追加**: JSDocによる型安全性
2. **テスト可能設計**: 依存性注入導入
3. **キャッシュ機能**: パフォーマンス最適化

**期待効果**:
- バグ予防
- テスト容易性
- 将来拡張対応

## 移行戦略

### 段階的移行アプローチ
1. **既存機能の維持**: 現在の動作を保証
2. **並行開発**: 新旧コードの併存期間設定
3. **順次置換**: リスクを最小化した置換

### リスク管理
1. **バックアップ**: 変更前の完全バックアップ
2. **テスト計画**: 各フェーズでの動作確認
3. **ロールバック計画**: 問題発生時の復旧手順

### 成功指標
1. **コード行数**: 重複削除による削減
2. **処理時間**: バッチ処理の高速化
3. **エラー率**: エラーハンドリング改善による低下
4. **保守性**: コード変更の容易さ向上

## 注意事項

- **段階的実装**: 一度に大きな変更を避ける
- **動作確認**: 各段階での徹底的なテスト
- **文書更新**: 変更に伴う仕様書の同期更新
- **チーム共有**: 変更内容の関係者への周知
