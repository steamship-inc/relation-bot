/**
 * re:lation連携システム設定
 */

// 基本設定
var RELATION_CONFIG = {
  subdomain: 'steamship',
  baseUrl: 'https://steamship.relationapp.jp',
  apiVersion: 'v2',
  searchConditions: {
    status_cds: ["open"],
    per_page: 50,
    page: 1
  }
};

/**
 * APIキーを取得
 */
function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty('RELATION_API_KEY');
}

/**
 * APIのURLを生成
 * @param {string} path APIパス
 * @param {string} messageBoxId 受信箱ID（オプション）
 */
function buildApiUrl(path, messageBoxId) {
  var url = RELATION_CONFIG.baseUrl + '/api/' + RELATION_CONFIG.apiVersion;
  
  if (messageBoxId) {
    url += '/' + messageBoxId;
  }
  
  return url + '/' + path;
}

/**
 * チケット詳細URLを生成
 */
function buildTicketUrl(messageBoxId, ticketId, status) {
  status = status || 'open';
  return RELATION_CONFIG.baseUrl + '/tickets/#/' + messageBoxId + '/tickets/' + status + '/p1/' + ticketId;
}

/**
 * 検索条件を取得
 */
function getSearchConditions() {
  return RELATION_CONFIG.searchConditions;
}
