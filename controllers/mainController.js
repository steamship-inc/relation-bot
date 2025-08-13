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
    
    // オーケストレーターを使用して完全なワークフローを実行
    var summary = executeOpenTicketsFetch({
      enableNotifications: true,
      enableProgressDisplay: true
    });
    
    console.log('=== 全自治体オープンチケット取得完了 ===');
    console.log('処理結果: 成功 ' + summary.successfulMunicipalities + '/' + summary.totalMunicipalities + ' 自治体');
    console.log('取得チケット総数: ' + summary.totalTickets + ' 件');
    console.log('処理時間: ' + summary.duration);
    
    // 結果通知
    var ui = SpreadsheetApp.getUi();
    var message = '処理完了\\n\\n' +
                  '自治体数: ' + summary.totalMunicipalities + '\\n' +
                  'チケット数: ' + summary.totalTickets + '\\n' +
                  '処理時間: ' + summary.duration;
    
    if (summary.errors.length > 0) {
      message += '\\n\\nエラー: ' + summary.errors.length + '件';
    }
    
    ui.alert('チケット取得完了', message, ui.ButtonSet.OK);
    
    return summary;
    
  } catch (error) {
    handleError(error, 'fetchOpenTickets_v2', 
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
 * 包括的なシステムヘルスチェック（新機能）
 * Phase 5で追加された高度な診断機能
 */
function advancedSystemCheck() {
  try {
    console.log('=== 高度システムチェック開始 ===');
    
    // 構造化ログを使用
    StructuredLogger.info('高度システムチェック開始', {
      component: 'mainController',
      function: 'advancedSystemCheck'
    });
    
    var measureId = StructuredLogger.startPerformanceMeasure('advancedSystemCheck');
    
    // 包括的なヘルスチェック
    var healthCheck = comprehensiveHealthCheck();
    
    // 設定最適化の提案
    var optimizationResult = autoOptimizeConfiguration({ dryRun: true });
    
    // 結果のログ出力
    StructuredLogger.info('ヘルスチェック完了', {
      overall: healthCheck.overall,
      componentCount: Object.keys(healthCheck.components).length,
      recommendationCount: healthCheck.recommendations.length
    });
    
    StructuredLogger.endPerformanceMeasure(measureId, {
      healthStatus: healthCheck.overall,
      optimizationSuggestions: optimizationResult.applied.length
    });
    
    // UIに結果表示
    var ui = SpreadsheetApp.getUi();
    var statusIcon = healthCheck.overall === 'healthy' ? '✅' : 
                    healthCheck.overall === 'warning' ? '⚠️' : '❌';
    
    var message = statusIcon + ' システム状況: ' + getHealthStatusDescription(healthCheck.overall) + '\\n\\n';
    
    // コンポーネントごとの状況
    message += '【コンポーネント状況】\\n';
    if (healthCheck.components.configuration) {
      message += '設定: ' + getStatusDescription(healthCheck.components.configuration.status) + '\\n';
    }
    if (healthCheck.components.municipalities) {
      message += '自治体: ' + healthCheck.components.municipalities.valid + '/' + 
                 healthCheck.components.municipalities.total + ' 有効\\n';
    }
    
    // 最適化提案
    if (optimizationResult.applied.length > 0) {
      message += '\\n【最適化提案】\\n';
      optimizationResult.applied.slice(0, 3).forEach(function(suggestion) {
        message += '• ' + suggestion + '\\n';
      });
    }
    
    message += '\\n詳細はコンソールログをご確認ください。';
    
    ui.alert('高度システムチェック完了', message, ui.ButtonSet.OK);
    
    console.log('=== 高度システムチェック完了 ===');
    
    return {
      status: 'success',
      healthCheck: healthCheck,
      optimization: optimizationResult
    };
    
  } catch (error) {
    StructuredLogger.error('高度システムチェックエラー', {
      error: error.toString(),
      stack: error.stack
    });
    
    handleError(error, 'advancedSystemCheck', 
      '高度システムチェックでエラーが発生しました。'
    );
    
    return {
      status: 'error',
      error: error.toString()
    };
  }
}

/**
 * パフォーマンステスト（改良版）
 * 新しいログシステムを使用した詳細なパフォーマンス分析
 */
function performanceTest() {
  try {
    StructuredLogger.info('パフォーマンステスト開始');
    
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'パフォーマンステスト', 
      'この機能は開発・最適化用です。実行しますか？', 
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    var testResults = [];
    
    // テスト1: 設定検証のパフォーマンス
    var measureId1 = StructuredLogger.startPerformanceMeasure('configValidation');
    var configValidation = validateAndOptimizeConfiguration();
    StructuredLogger.endPerformanceMeasure(measureId1, {
      issueCount: configValidation.issues.length
    });
    testResults.push('設定検証: 完了');
    
    // テスト2: 自治体設定検証のパフォーマンス
    var measureId2 = StructuredLogger.startPerformanceMeasure('municipalityValidation');
    var municipalityValidation = validateAllMunicipalityConfigs();
    StructuredLogger.endPerformanceMeasure(measureId2, {
      municipalityCount: municipalityValidation.total
    });
    testResults.push('自治体設定検証: ' + municipalityValidation.total + '件処理');
    
    // テスト3: メモリ使用量チェック
    var measureId3 = StructuredLogger.startPerformanceMeasure('memoryCheck');
    var memoryInfo = DebugHelper.checkMemoryUsage();
    StructuredLogger.endPerformanceMeasure(measureId3, memoryInfo);
    testResults.push('メモリチェック: 完了');
    
    // 結果表示
    var message = 'パフォーマンステスト完了\\n\\n' +
                  testResults.join('\\n') + '\\n\\n' +
                  '詳細な測定結果はコンソールログを確認してください。';
    
    ui.alert('パフォーマンステスト完了', message, ui.ButtonSet.OK);
    
    StructuredLogger.info('パフォーマンステスト完了', {
      testCount: testResults.length
    });
    
  } catch (error) {
    StructuredLogger.error('パフォーマンステストエラー', {
      error: error.toString()
    });
    
    handleError(error, 'performanceTest', 
      'パフォーマンステストでエラーが発生しました。'
    );
  }
}

/**
 * システム診断機能（改良版）
 * 設定とデータの整合性をチェック
 */
function systemDiagnostics() {
  try {
    console.log('=== システム診断開始 ===');
    
    // 包括的なヘルスチェックを実行
    var healthCheck = comprehensiveHealthCheck();
    
    // 設定最適化レポートを生成
    var configReport = generateConfigurationReport();
    
    // 品質レポートを生成
    var qualityReport = generateQualityReport();
    
    // 結果をUIに表示
    var ui = SpreadsheetApp.getUi();
    var message = '【システム診断結果】\\n\\n' +
                  '全体状況: ' + getHealthStatusDescription(healthCheck.overall) + '\\n\\n' +
                  '設定状況: ' + getStatusDescription(healthCheck.components.configuration.status) + '\\n' +
                  '自治体設定: ' + healthCheck.components.municipalities.total + '件 (有効: ' + 
                  healthCheck.components.municipalities.valid + '件)\\n\\n';
    
    if (healthCheck.recommendations.length > 0) {
      message += '【推奨事項】\\n';
      healthCheck.recommendations.forEach(function(rec) {
        message += '• ' + rec + '\\n';
      });
      message += '\\n';
    }
    
    message += '詳細レポートはコンソールログを確認してください。';
    
    ui.alert('システム診断完了', message, ui.ButtonSet.OK);
    
    // 詳細レポートをログに出力
    console.log('=== 設定診断レポート ===');
    console.log(configReport);
    console.log('');
    console.log('=== 品質レポート ===');
    console.log(qualityReport);
    
    console.log('=== システム診断完了 ===');
    
    return {
      healthCheck: healthCheck,
      configReport: configReport,
      qualityReport: qualityReport
    };
    
  } catch (error) {
    handleError(error, 'systemDiagnostics', 
      'システム診断でエラーが発生しました。'
    );
  }
}

/**
 * ヘルス状況の説明を取得
 * @param {string} status ヘルス状況
 * @return {string} 説明
 */
function getHealthStatusDescription(status) {
  var descriptions = {
    'healthy': '正常',
    'warning': '注意',
    'critical': '要修正',
    'error': 'エラー',
    'unknown': '不明'
  };
  
  return descriptions[status] || status;
}
