/**
 * 統一エラーハンドリングユーティリティ
 */

/**
 * エラーを統一的に処理する
 * @param {Error} error エラーオブジェクト
 * @param {string} context エラーが発生したコンテキスト
 * @param {string} userMessage ユーザー向けメッセージ (オプション)
 * @returns {Object} エラー情報オブジェクト
 */
function handleError(error, context, userMessage) {
  var errorInfo = {
    timestamp: new Date(),
    context: context,
    error: error.toString(),
    stack: error.stack
  };
  
  console.error('Error in ' + context + ':', errorInfo);
  
  if (userMessage) {
    var ui = SpreadsheetApp.getUi();
    ui.alert('エラー', userMessage + '\n\n詳細: ' + error.toString(), ui.ButtonSet.OK);
  }
  
  return errorInfo;
}

/**
 * 関数をエラーハンドリングでラップする
 * @param {Function} func ラップする関数
 * @param {string} context エラーコンテキスト
 * @param {string} userMessage ユーザー向けエラーメッセージ
 * @returns {Function} ラップされた関数
 */
function wrapWithErrorHandling(func, context, userMessage) {
  return function() {
    try {
      return func.apply(this, arguments);
    } catch (error) {
      return handleError(error, context, userMessage);
    }
  };
}

/**
 * API呼び出し用の統一エラーハンドリング
 * @param {Function} apiCall API呼び出し関数
 * @param {string} apiName API名
 * @param {Object} context 追加コンテキスト情報
 * @returns {Object} レスポンスまたはエラー
 */
function handleApiCall(apiCall, apiName, context) {
  try {
    var response = apiCall();
    return {
      success: true,
      data: response
    };
  } catch (error) {
    var errorMessage = apiName + 'の呼び出しに失敗しました';
    if (context && context.municipalityName) {
      errorMessage += ' (自治体: ' + context.municipalityName + ')';
    }
    
    console.error(errorMessage + ': ' + error.toString());
    
    return {
      success: false,
      error: error.toString(),
      context: context
    };
  }
}