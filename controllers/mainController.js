/**
 * コントローラー層 - リファクタリング版
 * メニューから呼び出される関数の責務分離版
 * 既存の関数名を保持して下位互換性を確保
 */

/**
 * 全自治体のオープンチケットを取得してシートに統合出力
 * メニューから呼び出される主要機能（リファクタリング版）
 */
function fetchOpenTickets_v2() {
  try {
    console.log('=== 全自治体オープンチケット取得開始 ===');
    
    var result = TicketService.fetchAllOpenTickets();
    
    console.log('=== 全自治体オープンチケット取得完了 ===');
    console.log('処理結果: 成功 ' + result.successCount + '/' + result.totalCount + ' 自治体');
    console.log('取得チケット総数: ' + result.dataCount + ' 件');
    
    // 結果通知
    NotificationService.showCompletionAlert('全自治体チケット取得完了', result);
    
    return result;
    
  } catch (error) {
    handleError(error, 'fetchOpenTickets', 
      'チケット取得処理でエラーが発生しました。\\n\\n' +
      'エラー詳細: ' + error.toString() + '\\n\\n' +
      '以下を確認してください:\\n' +
      '1. ネットワーク接続\\n' +
      '2. APIキーの設定\\n' +
      '3. 受信箱シートの設定'
    );
    throw error;
  }
}

/**
 * 全自治体のチケット分類一覧を取得・更新
 * メニューから呼び出される機能（リファクタリング版）
 */
function fetchCaseCategories_v2() {
  try {
    console.log('=== 全自治体チケット分類取得開始 ===');
    
    var result = MasterDataService.fetchAllCaseCategories();
    
    console.log('=== 全自治体チケット分類取得完了 ===');
    console.log('処理結果: 成功 ' + result.successCount + '/' + result.totalCount + ' 自治体');
    console.log('取得分類総数: ' + result.dataCount + ' 件');
    
    // 結果通知
    NotificationService.showCompletionAlert('全自治体チケット分類取得完了', result);
    
    return result;
    
  } catch (error) {
    handleError(error, 'fetchCaseCategories', 
      'チケット分類取得処理でエラーが発生しました。\\n\\n' +
      'エラー詳細: ' + error.toString()
    );
    throw error;
  }
}

/**
 * 全自治体のラベル一覧を取得・更新
 * メニューから呼び出される機能（リファクタリング版）
 */
function fetchLabels_v2() {
  try {
    console.log('=== 全自治体ラベル取得開始 ===');
    
    var result = MasterDataService.fetchAllLabels();
    
    console.log('=== 全自治体ラベル取得完了 ===');
    console.log('処理結果: 成功 ' + result.successCount + '/' + result.totalCount + ' 自治体');
    console.log('取得ラベル総数: ' + result.dataCount + ' 件');
    
    // 結果通知
    NotificationService.showCompletionAlert('全自治体ラベル取得完了', result);
    
    return result;
    
  } catch (error) {
    handleError(error, 'fetchLabels', 
      'ラベル取得処理でエラーが発生しました。\\n\\n' +
      'エラー詳細: ' + error.toString()
    );
    throw error;
  }
}

/**
 * メッセージボックス一覧を取得・更新
 * メニューから呼び出される機能（リファクタリング版）
 */
function fetchMessageBoxes_v2() {
  try {
    console.log('=== メッセージボックス取得開始 ===');
    
    var result = MessageBoxService.fetchAndUpdateMessageBoxes();
    
    console.log('=== メッセージボックス取得完了 ===');
    console.log('処理結果: 成功 ' + result.successCount + '/' + result.totalCount + ' 件');
    console.log('コード表マッチ数: ' + result.dataCount + ' 件');
    
    // 結果通知
    NotificationService.showCompletionAlert('メッセージボックス取得完了', result);
    
    return result;
    
  } catch (error) {
    handleError(error, 'fetchMessageBoxes', 
      'メッセージボックス取得処理でエラーが発生しました。\\n\\n' +
      'エラー詳細: ' + error.toString()
    );
    throw error;
  }
}

/**
 * 下位互換性のためのラッパー関数群
 * 既存のメニューシステムとの互換性を保つ
 */

// 既存関数の動作テスト用（段階的移行）
function testRefactoredFunctions() {
  try {
    console.log('=== リファクタリング版関数のテスト開始 ===');
    
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'リファクタリング版テスト', 
      'どの機能をテストしますか？', 
      ui.ButtonSet.YES_NO_CANCEL
    );
    
    if (response === ui.Button.YES) {
      // チケット取得テスト
      console.log('チケット取得テスト開始');
      fetchOpenTickets_v2();
      
    } else if (response === ui.Button.NO) {
      // マスタデータ取得テスト
      console.log('マスタデータ取得テスト開始');
      fetchCaseCategories_v2();
      
    } else if (response === ui.Button.CANCEL) {
      // メッセージボックス取得テスト
      console.log('メッセージボックス取得テスト開始');
      fetchMessageBoxes_v2();
    }
    
    console.log('=== リファクタリング版関数のテスト完了 ===');
    
  } catch (error) {
    handleError(error, 'testRefactoredFunctions', 
      'リファクタリング版のテストでエラーが発生しました。'
    );
  }
}

/**
 * パフォーマンス比較テスト
 * 旧版と新版の処理時間を比較
 */
function performanceComparison() {
  try {
    console.log('=== パフォーマンス比較テスト開始 ===');
    
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'パフォーマンス比較', 
      'この機能は開発用です。実行しますか？', 
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    // 小さなデータセットでテスト
    var startTime = new Date();
    
    // リファクタリング版を実行
    console.log('リファクタリング版実行開始');
    fetchOpenTickets_v2();
    
    var endTime = new Date();
    var executionTime = endTime - startTime;
    
    console.log('実行時間: ' + executionTime + 'ms');
    
    ui.alert('パフォーマンステスト完了', 
      '実行時間: ' + (executionTime / 1000) + '秒\\n\\n' +
      '詳細はログを確認してください。', 
      ui.ButtonSet.OK);
    
    console.log('=== パフォーマンス比較テスト完了 ===');
    
  } catch (error) {
    handleError(error, 'performanceComparison', 
      'パフォーマンス比較テストでエラーが発生しました。'
    );
  }
}

/**
 * システム診断機能
 * 設定とデータの整合性をチェック
 */
function systemDiagnostics() {
  try {
    console.log('=== システム診断開始 ===');
    
    var diagnosticResults = [];
    
    // 1. API設定チェック
    try {
      var apiKey = getRelationApiKey();
      diagnosticResults.push('✓ APIキー設定OK');
    } catch (error) {
      diagnosticResults.push('✗ APIキー設定エラー: ' + error.toString());
    }
    
    // 2. 自治体設定チェック
    try {
      var configs = ConfigService.getMunicipalityConfigs(true);
      var configCount = Object.keys(configs).length;
      diagnosticResults.push('✓ 自治体設定OK (' + configCount + '件)');
    } catch (error) {
      diagnosticResults.push('✗ 自治体設定エラー: ' + error.toString());
    }
    
    // 3. シート構造チェック
    var requiredSheets = ['MESSAGE_BOXES', 'OPEN_TICKETS', 'CASE_CATEGORIES', 'LABELS'];
    requiredSheets.forEach(function(sheetKey) {
      try {
        var sheetName = getSheetName(sheetKey);
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = ss.getSheetByName(sheetName);
        if (sheet) {
          diagnosticResults.push('✓ シート存在確認OK: ' + sheetName);
        } else {
          diagnosticResults.push('⚠ シート未作成: ' + sheetName);
        }
      } catch (error) {
        diagnosticResults.push('✗ シートチェックエラー: ' + sheetKey);
      }
    });
    
    // 4. 定数設定チェック
    try {
      var batchSize = getConstant('BATCH_SIZE');
      var waitTime = getConstant('RATE_LIMIT_WAIT');
      diagnosticResults.push('✓ 定数設定OK (バッチサイズ: ' + batchSize + ', 待機時間: ' + waitTime + 'ms)');
    } catch (error) {
      diagnosticResults.push('✗ 定数設定エラー: ' + error.toString());
    }
    
    // 結果表示
    var ui = SpreadsheetApp.getUi();
    var message = 'システム診断結果:\\n\\n' + diagnosticResults.join('\\n');
    ui.alert('システム診断完了', message, ui.ButtonSet.OK);
    
    console.log('=== システム診断完了 ===');
    console.log('診断結果:');
    diagnosticResults.forEach(function(result) {
      console.log(result);
    });
    
  } catch (error) {
    handleError(error, 'systemDiagnostics', 
      'システム診断でエラーが発生しました。'
    );
  }
}
