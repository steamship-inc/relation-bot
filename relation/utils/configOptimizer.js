/**
 * 設定管理の最適化ユーティリティ
 * Phase 5: 設定値の検証・最適化・管理を担当
 */

/**
 * 全体設定の検証と最適化
 * @return {Object} 検証結果と推奨設定
 */
function validateAndOptimizeConfiguration() {
  var validation = {
    status: 'unknown',
    issues: [],
    recommendations: [],
    optimizations: [],
    performance: {}
  };
  
  try {
    // 1. 定数設定の検証
    var constantsValidation = validateConstants();
    validation.issues = validation.issues.concat(constantsValidation.issues);
    validation.recommendations = validation.recommendations.concat(constantsValidation.recommendations);
    
    // 2. API設定の検証
    var apiValidation = validateApiConfiguration();
    validation.issues = validation.issues.concat(apiValidation.issues);
    validation.recommendations = validation.recommendations.concat(apiValidation.recommendations);
    
    // 3. 自治体設定の最適化チェック
    var municipalityValidation = validateAllMunicipalityConfigs();
    if (municipalityValidation.invalid > 0) {
      validation.issues.push('無効な自治体設定が ' + municipalityValidation.invalid + ' 件あります');
    }
    if (municipalityValidation.warnings > 0) {
      validation.recommendations.push('警告のある自治体設定が ' + municipalityValidation.warnings + ' 件あります');
    }
    
    // 4. パフォーマンス最適化の提案
    var performanceAnalysis = analyzePerformanceConfiguration();
    validation.performance = performanceAnalysis;
    validation.optimizations = performanceAnalysis.suggestions;
    
    // 5. 全体ステータスの決定
    if (validation.issues.length === 0) {
      validation.status = 'excellent';
    } else if (validation.issues.length <= 2) {
      validation.status = 'good';
    } else if (validation.issues.length <= 5) {
      validation.status = 'fair';
    } else {
      validation.status = 'poor';
    }
    
    return validation;
    
  } catch (error) {
    validation.status = 'error';
    validation.issues.push('設定検証中にエラーが発生: ' + error.toString());
    return validation;
  }
}

/**
 * 定数設定の検証
 * @return {Object} 検証結果
 */
function validateConstants() {
  var result = {
    issues: [],
    recommendations: []
  };
  
  try {
    // バッチサイズの検証
    var batchSize = getConstant('BATCH_SIZE');
    if (batchSize > 100) {
      result.issues.push('バッチサイズが大きすぎます (現在: ' + batchSize + ')');
      result.recommendations.push('バッチサイズを50-100の範囲に設定することを推奨します');
    } else if (batchSize < 10) {
      result.recommendations.push('バッチサイズが小さく、処理効率が低い可能性があります');
    }
    
    // 待機時間の検証
    var waitTime = getConstant('RATE_LIMIT_WAIT');
    if (waitTime < 50) {
      result.issues.push('API制限待機時間が短すぎます (現在: ' + waitTime + 'ms)');
      result.recommendations.push('API制限を避けるため、100ms以上に設定することを推奨します');
    } else if (waitTime > 1000) {
      result.recommendations.push('待機時間が長く、処理時間が延びる可能性があります (現在: ' + waitTime + 'ms)');
    }
    
    // タイムアウト設定の検証
    var timeout = getConstant('API.TIMEOUT');
    if (timeout < 10000) {
      result.recommendations.push('APIタイムアウトが短く、大きなデータ取得時に失敗する可能性があります');
    }
    
    // リトライ設定の検証
    var maxRetries = getConstant('API.MAX_RETRIES');
    if (maxRetries < 2) {
      result.recommendations.push('リトライ回数を増やすことで、一時的なエラーへの耐性が向上します');
    } else if (maxRetries > 5) {
      result.recommendations.push('リトライ回数が多すぎると、処理時間が長くなる可能性があります');
    }
    
  } catch (error) {
    result.issues.push('定数設定の検証中にエラー: ' + error.toString());
  }
  
  return result;
}

/**
 * API設定の検証
 * @return {Object} 検証結果
 */
function validateApiConfiguration() {
  var result = {
    issues: [],
    recommendations: []
  };
  
  try {
    // APIキーの存在確認
    var apiKey = getRelationApiKey();
    if (!apiKey) {
      result.issues.push('APIキーが設定されていません');
    } else if (apiKey.length < 20) {
      result.issues.push('APIキーが短すぎます。正しいキーが設定されているか確認してください');
    }
    
    // Webhook URLの確認
    var webhookUrl = getSlackWebhookUrl();
    if (!webhookUrl) {
      result.recommendations.push('Slack Webhook URLを設定すると、処理結果の通知を受け取れます');
    } else if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      result.issues.push('Slack Webhook URLの形式が正しくありません');
    }
    
  } catch (error) {
    result.issues.push('API設定の検証中にエラー: ' + error.toString());
  }
  
  return result;
}

/**
 * パフォーマンス設定の分析
 * @return {Object} パフォーマンス分析結果
 */
function analyzePerformanceConfiguration() {
  var analysis = {
    currentSettings: {},
    estimatedPerformance: {},
    suggestions: []
  };
  
  try {
    // 現在の設定を収集
    analysis.currentSettings = {
      batchSize: getConstant('BATCH_SIZE'),
      waitTime: getConstant('RATE_LIMIT_WAIT'),
      timeout: getConstant('API.TIMEOUT'),
      maxRetries: getConstant('API.MAX_RETRIES')
    };
    
    // 自治体数に基づく推定処理時間
    var municipalityCount = getEnabledMunicipalities().length;
    var estimatedTime = calculateEstimatedProcessingTime(municipalityCount, analysis.currentSettings);
    
    analysis.estimatedPerformance = {
      municipalityCount: municipalityCount,
      estimatedDuration: estimatedTime,
      recommendedBatchSize: Math.min(50, Math.max(10, Math.floor(municipalityCount / 10)))
    };
    
    // 最適化提案
    if (analysis.currentSettings.batchSize !== analysis.estimatedPerformance.recommendedBatchSize) {
      analysis.suggestions.push(
        'バッチサイズを ' + analysis.estimatedPerformance.recommendedBatchSize + 
        ' に変更すると処理効率が向上する可能性があります'
      );
    }
    
    if (municipalityCount > 100 && analysis.currentSettings.waitTime < 200) {
      analysis.suggestions.push('大量の自治体を処理する場合、待機時間を200ms以上にすることを推奨します');
    }
    
    if (estimatedTime > 300000) { // 5分以上
      analysis.suggestions.push('処理時間が長くなる予想です。バッチ処理の分割を検討してください');
    }
    
  } catch (error) {
    analysis.suggestions.push('パフォーマンス分析中にエラー: ' + error.toString());
  }
  
  return analysis;
}

/**
 * 処理時間の推定計算
 * @param {number} municipalityCount 自治体数
 * @param {Object} settings 設定値
 * @return {number} 推定処理時間（ミリ秒）
 */
function calculateEstimatedProcessingTime(municipalityCount, settings) {
  // API呼び出し時間の推定（自治体あたり平均2秒）
  var apiCallTime = municipalityCount * 2000;
  
  // 待機時間の推定
  var waitTime = municipalityCount * settings.waitTime;
  
  // リトライ時間の推定（10%のAPIがリトライと仮定）
  var retryTime = municipalityCount * 0.1 * settings.maxRetries * 1000;
  
  // シート書き込み時間の推定
  var sheetWriteTime = Math.ceil(municipalityCount / settings.batchSize) * 500;
  
  return apiCallTime + waitTime + retryTime + sheetWriteTime;
}

/**
 * 設定の自動最適化実行
 * @param {Object} options 最適化オプション
 * @return {Object} 最適化結果
 */
function autoOptimizeConfiguration(options) {
  options = options || {};
  
  var result = {
    applied: [],
    skipped: [],
    errors: []
  };
  
  try {
    var validation = validateAndOptimizeConfiguration();
    
    if (!options.dryRun) {
      // バッチサイズの最適化
      var recommendedBatchSize = validation.performance.recommendedBatchSize;
      if (recommendedBatchSize && recommendedBatchSize !== getConstant('BATCH_SIZE')) {
        try {
          // Note: 実際の設定変更は constants.js ファイルの変更が必要
          result.applied.push('バッチサイズの最適化を推奨: ' + recommendedBatchSize);
        } catch (error) {
          result.errors.push('バッチサイズ最適化エラー: ' + error.toString());
        }
      }
    }
    
    return result;
    
  } catch (error) {
    result.errors.push('自動最適化中にエラー: ' + error.toString());
    return result;
  }
}

/**
 * 設定レポートの生成
 * @return {string} 設定レポート
 */
function generateConfigurationReport() {
  try {
    var validation = validateAndOptimizeConfiguration();
    var stats = getMunicipalityStatistics();
    
    var report = [];
    report.push('=== 設定診断レポート ===');
    report.push('');
    report.push('【全体ステータス】');
    report.push('状態: ' + getStatusDescription(validation.status));
    report.push('');
    
    report.push('【自治体設定】');
    report.push('総数: ' + stats.total);
    report.push('有効: ' + stats.enabled);
    report.push('無効: ' + stats.disabled);
    report.push('');
    
    report.push('【パフォーマンス】');
    report.push('推定処理時間: ' + Math.round(validation.performance.estimatedDuration / 1000) + '秒');
    report.push('推奨バッチサイズ: ' + validation.performance.recommendedBatchSize);
    report.push('');
    
    if (validation.issues.length > 0) {
      report.push('【修正が必要な問題】');
      validation.issues.forEach(function(issue) {
        report.push('• ' + issue);
      });
      report.push('');
    }
    
    if (validation.recommendations.length > 0) {
      report.push('【推奨改善】');
      validation.recommendations.forEach(function(rec) {
        report.push('• ' + rec);
      });
      report.push('');
    }
    
    if (validation.optimizations.length > 0) {
      report.push('【最適化提案】');
      validation.optimizations.forEach(function(opt) {
        report.push('• ' + opt);
      });
      report.push('');
    }
    
    report.push('レポート生成日時: ' + new Date().toLocaleString('ja-JP'));
    
    return report.join('\n');
    
  } catch (error) {
    return '設定レポート生成中にエラーが発生しました: ' + error.toString();
  }
}

/**
 * ステータスの説明を取得
 * @param {string} status ステータス
 * @return {string} 説明
 */
function getStatusDescription(status) {
  var descriptions = {
    'excellent': '優秀 - 設定に問題はありません',
    'good': '良好 - 軽微な改善点があります',
    'fair': '普通 - いくつかの改善が推奨されます',
    'poor': '要改善 - 重要な問題があります',
    'error': 'エラー - 設定確認中に問題が発生しました',
    'unknown': '不明 - 診断を実行してください'
  };
  
  return descriptions[status] || status;
}
