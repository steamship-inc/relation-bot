/**
 * re:lation API関連のヘルパー関数
 * URL構築、共通設定、パラメータ管理を担当
 */

/**
 * re:lation APIの基本URL取得
 * @return {string} 基本URL
 */
function getRelationBaseUrl() {
  return 'https://api.re-lation.app';
}

/**
 * チケット検索APIのURL構築
 * @param {string} messageBoxId メッセージボックスID
 * @return {string} API URL
 */
function buildTicketSearchUrl(messageBoxId) {
  var baseUrl = getRelationBaseUrl();
  return baseUrl + '/message_boxes/' + messageBoxId + '/tickets/search';
}

/**
 * チケット分類APIのURL構築
 * @param {string} messageBoxId メッセージボックスID
 * @return {string} API URL
 */
function buildCaseCategoriesUrl(messageBoxId) {
  var baseUrl = getRelationBaseUrl();
  return baseUrl + '/message_boxes/' + messageBoxId + '/case_categories';
}

/**
 * ラベルAPIのURL構築
 * @param {string} messageBoxId メッセージボックスID
 * @return {string} API URL
 */
function buildLabelsUrl(messageBoxId) {
  var baseUrl = getRelationBaseUrl();
  return baseUrl + '/message_boxes/' + messageBoxId + '/labels';
}

/**
 * メッセージボックス一覧APIのURL構築
 * @return {string} API URL
 */
function buildMessageBoxesUrl() {
  var baseUrl = getRelationBaseUrl();
  return baseUrl + '/message_boxes';
}

/**
 * チケット詳細URLの構築
 * @param {string} messageBoxId メッセージボックスID
 * @param {string} ticketId チケットID
 * @param {string} status ステータス（'open', 'closed'等）
 * @return {string} チケット詳細URL
 */
function buildTicketUrl(messageBoxId, ticketId, status) {
  var baseUrl = getRelationBaseUrl();
  return baseUrl + '/tickets/#/' + messageBoxId + '/tickets/' + status + '/p1?ticket_id=' + ticketId;
}

/**
 * APIキーをスクリプトプロパティから取得
 * @return {string} APIキー
 * @throws {Error} APIキーが設定されていない場合
 */
function getRelationApiKey() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('RELATION_API_KEY');
  
  if (!apiKey) {
    throw new Error('RELATION_API_KEYが設定されていません。スクリプトプロパティに設定してください。');
  }
  
  return apiKey;
}

/**
 * 共通の検索条件を取得
 * @return {Object} 検索条件オブジェクト
 */
function getCommonSearchConditions() {
  return {
    // オープン状態のチケットのみ
    status_cds: ['open', 'in_progress', 'pending'],
    // 1ページあたりの件数（最大100件）
    per_page: 100,
    // ページ番号
    page: 1
  };
}

/**
 * API制限に配慮したリクエスト実行
 * @param {Function} apiCall API呼び出し関数
 * @param {string} context コンテキスト情報
 * @param {Object} options オプション設定
 * @return {*} API呼び出し結果
 */
function executeApiCall(apiCall, context, options) {
  options = options || {};
  var maxRetries = options.maxRetries || getConstant('API.MAX_RETRIES');
  var timeout = options.timeout || getConstant('API.TIMEOUT');
  
  return executeWithRetry(function() {
    // タイムアウト設定でAPI呼び出し
    var result = apiCall();
    
    // API制限対策の待機
    if (options.rateLimitWait !== false) {
      Utilities.sleep(options.rateLimitWait || 100);
    }
    
    return result;
    
  }, context, {
    maxRetries: maxRetries,
    retryDelay: 1000,
    exponentialBackoff: true
  });
}

/**
 * APIレスポンスの基本検証
 * @param {Object} response URLFetchAppのレスポンス
 * @param {string} context コンテキスト情報
 * @return {Object} パースされたレスポンス
 * @throws {Error} レスポンスが無効な場合
 */
function validateApiResponse(response, context) {
  // HTTPステータスコードチェック
  var responseCode = response.getResponseCode();
  
  if (responseCode !== 200) {
    var errorMessage = context + ' - HTTP エラー: ' + responseCode;
    
    // よくあるエラーコードの詳細メッセージ
    switch (responseCode) {
      case 400:
        errorMessage += ' (Bad Request - リクエストパラメータを確認してください)';
        break;
      case 401:
        errorMessage += ' (Unauthorized - APIキーを確認してください)';
        break;
      case 403:
        errorMessage += ' (Forbidden - アクセス権限を確認してください)';
        break;
      case 404:
        errorMessage += ' (Not Found - URLまたはリソースを確認してください)';
        break;
      case 429:
        errorMessage += ' (Rate Limited - API制限に達しました。しばらく待ってから再試行してください)';
        break;
      case 500:
        errorMessage += ' (Internal Server Error - サーバーエラーです。しばらく待ってから再試行してください)';
        break;
      default:
        errorMessage += ' (予期しないエラーです)';
    }
    
    throw new Error(errorMessage);
  }
  
  // レスポンス内容の取得とパース
  var contentText = response.getContentText();
  
  if (!contentText) {
    throw new Error(context + ' - 空のレスポンスが返されました');
  }
  
  try {
    return JSON.parse(contentText);
  } catch (parseError) {
    throw new Error(context + ' - JSONパースエラー: ' + parseError.toString());
  }
}

/**
 * API呼び出しの完全なラッパー関数
 * @param {string} url API URL
 * @param {Object} options fetch オプション
 * @param {string} context コンテキスト情報
 * @return {Object} パースされたレスポンス
 */
function safeApiFetch(url, options, context) {
  validateData(url, 'url', { required: true, type: 'string' });
  validateData(options, 'options', { required: true, type: 'object' });
  
  return executeApiCall(function() {
    // APIキーをヘッダーに追加
    var apiKey = getRelationApiKey();
    options.headers = options.headers || {};
    options.headers['Authorization'] = 'Bearer ' + apiKey;
    options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
    
    // API呼び出し実行
    var response = UrlFetchApp.fetch(url, options);
    
    // レスポンス検証とパース
    return validateApiResponse(response, context);
    
  }, context + ' API呼び出し');
}
