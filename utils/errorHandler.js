/**
 * エラーハンドリング統一管理
 * 全機能で一貫したエラー処理を提供
 */

/**
 * エラーハンドラー
 * @param {Error} error エラーオブジェクト
 * @param {string} context エラーが発生したコンテキスト
 * @param {string} userFriendlyMessage ユーザー向けメッセージ
 * @param {Object} options オプション設定
 * @return {Object} エラー情報オブジェクト
 */
function handleError(error, context, userFriendlyMessage, options) {
  options = options || {};
  
  var errorInfo = {
    timestamp: new Date(),
    context: context,
    error: error.toString(),
    stack: error.stack || 'スタックトレースなし',
    severity: options.severity || 'ERROR'
  };
  
  // ログ出力
  console.error('=== エラー情報 ===');
  console.error('コンテキスト: ' + context);
  console.error('エラー: ' + error.toString());
  console.error('発生時刻: ' + errorInfo.timestamp);
  if (error.stack) {
    console.error('スタックトレース: ' + error.stack);
  }
  console.error('================');
  
  // ユーザー通知（オプション）
  if (userFriendlyMessage && !options.suppressUserAlert) {
    var ui = SpreadsheetApp.getUi();
    var alertTitle = options.alertTitle || 'エラー';
    ui.alert(alertTitle, userFriendlyMessage, ui.ButtonSet.OK);
  }
  
  // 進捗表示の更新（オプション）
  if (options.progressCell) {
    options.progressCell.setValue('エラー: ' + (options.errorContext || context));
    options.progressCell.setFontColor('red');
    SpreadsheetApp.flush();
  }
  
  return errorInfo;
}

/**
 * 関数をエラーハンドリングでラップ
 * @param {Function} func ラップする関数
 * @param {string} context コンテキスト名
 * @param {string} userMessage ユーザー向けエラーメッセージ
 * @param {Object} options オプション設定
 * @return {Function} ラップされた関数
 */
function wrapWithErrorHandling(func, context, userMessage, options) {
  return function() {
    try {
      return func.apply(this, arguments);
    } catch (error) {
      var errorInfo = handleError(error, context, userMessage, options);
      
      // エラー時の戻り値設定
      if (options && options.defaultReturn !== undefined) {
        return options.defaultReturn;
      }
      
      // エラーを再スローするかどうか
      if (options && options.suppressThrow) {
        return null;
      }
      
      throw error;
    }
  };
}

/**
 * 非同期処理（API呼び出し等）のエラーハンドリング
 * @param {Function} asyncFunc 非同期関数
 * @param {string} context コンテキスト
 * @param {Object} retryOptions リトライ設定
 * @return {*} 処理結果
 */
function executeWithRetry(asyncFunc, context, retryOptions) {
  retryOptions = retryOptions || {};
  var maxRetries = retryOptions.maxRetries || getConstant('API.MAX_RETRIES');
  var retryDelay = retryOptions.retryDelay || 1000;
  var exponentialBackoff = retryOptions.exponentialBackoff || false;
  
  var attempt = 0;
  var lastError = null;
  
  while (attempt <= maxRetries) {
    try {
      if (attempt > 0) {
        console.log(context + ' - リトライ ' + attempt + '/' + maxRetries);
        var delay = exponentialBackoff ? retryDelay * Math.pow(2, attempt - 1) : retryDelay;
        Utilities.sleep(delay);
      }
      
      return asyncFunc();
      
    } catch (error) {
      lastError = error;
      attempt++;
      
      console.error(context + ' - 試行 ' + attempt + ' 失敗: ' + error.toString());
      
      // 最後の試行でない場合は続行
      if (attempt <= maxRetries) {
        continue;
      }
    }
  }
  
  // 全ての試行が失敗した場合
  throw new Error(context + ' - ' + maxRetries + '回のリトライ後も失敗: ' + lastError.toString());
}

/**
 * API呼び出し専用のエラーハンドリング
 * @param {Function} apiCall API呼び出し関数
 * @param {string} apiName API名
 * @param {Object} options オプション設定
 * @return {*} API呼び出し結果
 */
function safeApiCall(apiCall, apiName, options) {
  options = options || {};
  
  return executeWithRetry(function() {
    try {
      var result = apiCall();
      
      // API制限対策の待機
      if (options.rateLimitWait) {
        Utilities.sleep(options.rateLimitWait);
      }
      
      return result;
      
    } catch (error) {
      // API固有のエラー処理
      if (error.toString().includes('429')) {
        throw new Error('API制限に達しました。しばらく待ってから再試行してください。');
      } else if (error.toString().includes('401')) {
        throw new Error('API認証に失敗しました。APIキーを確認してください。');
      } else if (error.toString().includes('403')) {
        throw new Error('API アクセス権限がありません。');
      } else if (error.toString().includes('404')) {
        throw new Error('APIエンドポイントが見つかりません。');
      }
      
      throw error;
    }
  }, apiName + ' API呼び出し', options);
}

/**
 * 検証エラー用の専用ハンドラー
 * @param {string} fieldName フィールド名
 * @param {*} value 検証対象の値
 * @param {string} requirement 要件
 */
function throwValidationError(fieldName, value, requirement) {
  var message = 'データ検証エラー: ' + fieldName;
  if (value !== undefined && value !== null) {
    message += ' (値: ' + value + ')';
  }
  message += ' - ' + requirement;
  
  throw new Error(message);
}

/**
 * データ検証ヘルパー
 * @param {*} value 検証対象の値
 * @param {string} fieldName フィールド名
 * @param {Object} rules 検証ルール
 */
function validateData(value, fieldName, rules) {
  rules = rules || {};
  
  // 必須チェック
  if (rules.required && (value === null || value === undefined || value === '')) {
    throwValidationError(fieldName, value, '必須項目です');
  }
  
  // 型チェック
  if (rules.type && value !== null && value !== undefined) {
    var actualType = typeof value;
    if (actualType !== rules.type) {
      throwValidationError(fieldName, value, '型が正しくありません（期待: ' + rules.type + ', 実際: ' + actualType + '）');
    }
  }
  
  // 配列チェック
  if (rules.isArray && value !== null && value !== undefined) {
    if (!Array.isArray(value)) {
      throwValidationError(fieldName, value, '配列である必要があります');
    }
  }
  
  // 範囲チェック
  if (rules.minLength !== undefined && value && value.length < rules.minLength) {
    throwValidationError(fieldName, value, '最小長 ' + rules.minLength + ' が必要です');
  }
  
  if (rules.maxLength !== undefined && value && value.length > rules.maxLength) {
    throwValidationError(fieldName, value, '最大長 ' + rules.maxLength + ' を超えています');
  }
  
  return true;
}
