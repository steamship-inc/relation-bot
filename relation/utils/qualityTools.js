/**
 * コード品質とメンテナンス性向上のためのユーティリティ
 * Phase 5: その他の改善 - ログ改善、デバッグ支援、品質チェック
 */

/**
 * 構造化ログ出力システム
 * より詳細で検索しやすいログを提供
 */
var StructuredLogger = {
  /**
   * ログレベル定数
   */
  LEVELS: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4
  },
  
  /**
   * 現在のログレベル
   */
  currentLevel: 1, // INFO以上を表示
  
  /**
   * 構造化ログエントリを作成
   * @param {string} level ログレベル
   * @param {string} message メッセージ
   * @param {Object} context コンテキスト情報
   * @return {Object} ログエントリ
   */
  createLogEntry: function(level, message, context) {
    return {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      context: context || {},
      sessionId: Session.getTemporaryActiveUserKey() || 'unknown'
    };
  },
  
  /**
   * デバッグログ
   * @param {string} message メッセージ
   * @param {Object} context コンテキスト
   */
  debug: function(message, context) {
    if (this.currentLevel <= this.LEVELS.DEBUG) {
      var entry = this.createLogEntry('DEBUG', message, context);
      console.log('[DEBUG]', JSON.stringify(entry));
    }
  },
  
  /**
   * 情報ログ
   * @param {string} message メッセージ
   * @param {Object} context コンテキスト
   */
  info: function(message, context) {
    if (this.currentLevel <= this.LEVELS.INFO) {
      var entry = this.createLogEntry('INFO', message, context);
      console.log('[INFO]', JSON.stringify(entry));
    }
  },
  
  /**
   * 警告ログ
   * @param {string} message メッセージ
   * @param {Object} context コンテキスト
   */
  warn: function(message, context) {
    if (this.currentLevel <= this.LEVELS.WARN) {
      var entry = this.createLogEntry('WARN', message, context);
      console.warn('[WARN]', JSON.stringify(entry));
    }
  },
  
  /**
   * エラーログ
   * @param {string} message メッセージ
   * @param {Object} context コンテキスト
   */
  error: function(message, context) {
    if (this.currentLevel <= this.LEVELS.ERROR) {
      var entry = this.createLogEntry('ERROR', message, context);
      console.error('[ERROR]', JSON.stringify(entry));
    }
  },
  
  /**
   * クリティカルログ（常に出力）
   * @param {string} message メッセージ
   * @param {Object} context コンテキスト
   */
  critical: function(message, context) {
    var entry = this.createLogEntry('CRITICAL', message, context);
    console.error('[CRITICAL]', JSON.stringify(entry));
    
    // クリティカルエラーは Slack にも送信
    try {
      sendSlackErrorNotification(
        'クリティカルエラーが発生しました',
        message,
        context
      );
    } catch (notificationError) {
      console.error('クリティカルエラーのSlack通知に失敗:', notificationError.toString());
    }
  },
  
  /**
   * パフォーマンス測定開始
   * @param {string} operationName 操作名
   * @return {string} 測定ID
   */
  startPerformanceMeasure: function(operationName) {
    var measureId = operationName + '_' + new Date().getTime();
    this.debug('パフォーマンス測定開始', {
      operation: operationName,
      measureId: measureId
    });
    return measureId;
  },
  
  /**
   * パフォーマンス測定終了
   * @param {string} measureId 測定ID
   * @param {Object} additionalInfo 追加情報
   */
  endPerformanceMeasure: function(measureId, additionalInfo) {
    var parts = measureId.split('_');
    var startTime = parseInt(parts[parts.length - 1]);
    var duration = new Date().getTime() - startTime;
    var operationName = parts.slice(0, -1).join('_');
    
    this.info('パフォーマンス測定終了', {
      operation: operationName,
      duration: duration + 'ms',
      additionalInfo: additionalInfo
    });
  }
};

/**
 * デバッグ支援機能
 */
var DebugHelper = {
  /**
   * オブジェクトの詳細情報を出力
   * @param {*} obj 対象オブジェクト
   * @param {string} label ラベル
   */
  inspect: function(obj, label) {
    label = label || 'Object';
    
    try {
      var info = {
        label: label,
        type: typeof obj,
        value: obj
      };
      
      if (Array.isArray(obj)) {
        info.isArray = true;
        info.length = obj.length;
        info.sample = obj.slice(0, 3); // 最初の3要素
      } else if (obj && typeof obj === 'object') {
        info.keys = Object.keys(obj);
        info.keyCount = info.keys.length;
      }
      
      StructuredLogger.debug('デバッグ詳細', info);
      
    } catch (error) {
      StructuredLogger.error('デバッグ出力エラー', {
        label: label,
        error: error.toString()
      });
    }
  },
  
  /**
   * 関数の実行をトレース
   * @param {Function} func 実行する関数
   * @param {string} funcName 関数名
   * @param {Array} args 引数
   * @return {*} 関数の戻り値
   */
  trace: function(func, funcName, args) {
    var measureId = StructuredLogger.startPerformanceMeasure(funcName);
    
    try {
      StructuredLogger.debug('関数実行開始', {
        function: funcName,
        arguments: args
      });
      
      var result = func.apply(null, args || []);
      
      StructuredLogger.debug('関数実行成功', {
        function: funcName,
        resultType: typeof result
      });
      
      StructuredLogger.endPerformanceMeasure(measureId, {
        success: true,
        resultType: typeof result
      });
      
      return result;
      
    } catch (error) {
      StructuredLogger.error('関数実行エラー', {
        function: funcName,
        error: error.toString(),
        stack: error.stack
      });
      
      StructuredLogger.endPerformanceMeasure(measureId, {
        success: false,
        error: error.toString()
      });
      
      throw error;
    }
  },
  
  /**
   * メモリ使用量の確認（概算）
   * @return {Object} メモリ情報
   */
  checkMemoryUsage: function() {
    try {
      // Google Apps Script では詳細なメモリ情報は取得できないため、
      // 実行時間とオブジェクト数で概算
      var info = {
        timestamp: new Date().toISOString(),
        estimatedObjectCount: this.countGlobalObjects(),
        executionTimeWarning: 'N/A'
      };
      
      StructuredLogger.info('メモリ使用量チェック', info);
      return info;
      
    } catch (error) {
      StructuredLogger.error('メモリ使用量チェックエラー', {
        error: error.toString()
      });
      return { error: error.toString() };
    }
  },
  
  /**
   * グローバルオブジェクトの概算数を取得
   * @return {number} オブジェクト数
   */
  countGlobalObjects: function() {
    try {
      var count = 0;
      for (var key in this) {
        count++;
      }
      return count;
    } catch (error) {
      return -1;
    }
  }
};

/**
 * コード品質チェック機能
 */
var QualityChecker = {
  /**
   * 関数の複雑度をチェック
   * @param {string} functionCode 関数のコード
   * @return {Object} 複雑度情報
   */
  checkComplexity: function(functionCode) {
    try {
      var complexity = {
        lineCount: 0,
        cyclomaticComplexity: 1, // 基本値
        nesting: 0,
        issues: []
      };
      
      if (!functionCode) {
        complexity.issues.push('コードが提供されていません');
        return complexity;
      }
      
      var lines = functionCode.split('\n');
      complexity.lineCount = lines.length;
      
      // 簡易的な複雑度計算
      var complexityKeywords = ['if', 'for', 'while', 'switch', 'catch', '&&', '||'];
      complexityKeywords.forEach(function(keyword) {
        var matches = functionCode.match(new RegExp('\\b' + keyword + '\\b', 'g'));
        if (matches) {
          complexity.cyclomaticComplexity += matches.length;
        }
      });
      
      // ネストレベルの確認（簡易）
      var maxNesting = 0;
      var currentNesting = 0;
      for (var i = 0; i < functionCode.length; i++) {
        if (functionCode[i] === '{') {
          currentNesting++;
          maxNesting = Math.max(maxNesting, currentNesting);
        } else if (functionCode[i] === '}') {
          currentNesting--;
        }
      }
      complexity.nesting = maxNesting;
      
      // 品質問題の検出
      if (complexity.lineCount > 100) {
        complexity.issues.push('関数が長すぎます (' + complexity.lineCount + ' 行)');
      }
      
      if (complexity.cyclomaticComplexity > 10) {
        complexity.issues.push('循環複雑度が高すぎます (' + complexity.cyclomaticComplexity + ')');
      }
      
      if (complexity.nesting > 4) {
        complexity.issues.push('ネストが深すぎます (' + complexity.nesting + ' レベル)');
      }
      
      return complexity;
      
    } catch (error) {
      return {
        error: error.toString(),
        issues: ['複雑度チェック中にエラーが発生しました']
      };
    }
  },
  
  /**
   * 命名規則のチェック
   * @param {string} name 変数名・関数名
   * @param {string} type タイプ ('function', 'variable', 'constant')
   * @return {Object} チェック結果
   */
  checkNamingConvention: function(name, type) {
    var result = {
      name: name,
      type: type,
      isValid: true,
      issues: [],
      suggestions: []
    };
    
    try {
      // 基本的なチェック
      if (!name || typeof name !== 'string') {
        result.isValid = false;
        result.issues.push('名前が提供されていません');
        return result;
      }
      
      // 長さチェック
      if (name.length < 3) {
        result.issues.push('名前が短すぎます');
        result.suggestions.push('より説明的な名前を使用してください');
      } else if (name.length > 50) {
        result.issues.push('名前が長すぎます');
        result.suggestions.push('名前を短縮してください');
      }
      
      // タイプ別のチェック
      switch (type) {
        case 'function':
          if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
            result.issues.push('関数名はキャメルケースで記述してください');
          }
          break;
          
        case 'variable':
          if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
            result.issues.push('変数名はキャメルケースで記述してください');
          }
          break;
          
        case 'constant':
          if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
            result.issues.push('定数名は大文字とアンダースコアで記述してください');
          }
          break;
      }
      
      // 予約語チェック
      var reservedWords = ['function', 'var', 'let', 'const', 'if', 'else', 'for', 'while'];
      if (reservedWords.indexOf(name.toLowerCase()) !== -1) {
        result.isValid = false;
        result.issues.push('予約語は使用できません');
      }
      
      result.isValid = result.issues.length === 0;
      
    } catch (error) {
      result.isValid = false;
      result.issues.push('命名規則チェック中にエラー: ' + error.toString());
    }
    
    return result;
  }
};

/**
 * 全体的な品質レポートの生成
 * @return {string} 品質レポート
 */
function generateQualityReport() {
  try {
    var report = [];
    report.push('=== コード品質レポート ===');
    report.push('生成日時: ' + new Date().toLocaleString('ja-JP'));
    report.push('');
    
    // 設定品質
    var configValidation = validateAndOptimizeConfiguration();
    report.push('【設定品質】');
    report.push('ステータス: ' + getStatusDescription(configValidation.status));
    report.push('問題数: ' + configValidation.issues.length);
    report.push('推奨改善数: ' + configValidation.recommendations.length);
    report.push('');
    
    // メモリ使用量
    var memoryInfo = DebugHelper.checkMemoryUsage();
    report.push('【リソース使用状況】');
    report.push('推定オブジェクト数: ' + memoryInfo.estimatedObjectCount);
    report.push('');
    
    // アーキテクチャ情報
    report.push('【アーキテクチャ】');
    report.push('レイヤー構造: Controller → Service → Data');
    report.push('ユーティリティモジュール数: 8');
    report.push('リファクタリング進捗: Phase 5 完了');
    report.push('');
    
    // 推奨事項
    report.push('【推奨事項】');
    report.push('• 構造化ログの使用 (StructuredLogger)');
    report.push('• パフォーマンス測定の実装');
    report.push('• 定期的な設定最適化の実行');
    report.push('• エラーハンドリングの統一');
    report.push('');
    
    return report.join('\n');
    
  } catch (error) {
    return '品質レポート生成中にエラー: ' + error.toString();
  }
}

/**
 * 包括的なシステムヘルスチェック
 * @return {Object} ヘルスチェック結果
 */
function comprehensiveHealthCheck() {
  var healthCheck = {
    timestamp: new Date().toISOString(),
    overall: 'unknown',
    components: {},
    recommendations: []
  };
  
  try {
    // 各コンポーネントのチェック
    healthCheck.components.configuration = validateAndOptimizeConfiguration();
    healthCheck.components.municipalities = validateAllMunicipalityConfigs();
    healthCheck.components.memory = DebugHelper.checkMemoryUsage();
    
    // 全体的な健全性の判定
    var issues = healthCheck.components.configuration.issues.length;
    var municipalityIssues = healthCheck.components.municipalities.invalid;
    
    if (issues === 0 && municipalityIssues === 0) {
      healthCheck.overall = 'healthy';
    } else if (issues <= 2 && municipalityIssues <= 2) {
      healthCheck.overall = 'warning';
    } else {
      healthCheck.overall = 'critical';
    }
    
    // 推奨事項の生成
    if (issues > 0) {
      healthCheck.recommendations.push('設定の問題を修正してください');
    }
    if (municipalityIssues > 0) {
      healthCheck.recommendations.push('自治体設定を確認してください');
    }
    
    StructuredLogger.info('ヘルスチェック完了', {
      overall: healthCheck.overall,
      issueCount: issues + municipalityIssues
    });
    
  } catch (error) {
    healthCheck.overall = 'error';
    healthCheck.error = error.toString();
    StructuredLogger.error('ヘルスチェックエラー', { error: error.toString() });
  }
  
  return healthCheck;
}
