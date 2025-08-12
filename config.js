/**
 * re:lation連携システム グローバル設定
 * 固定値や共通設定を管理
 */

// re:lation固定設定
var RELATION_SUBDOMAIN = 'steamship';
var RELATION_BASE_URL = 'https://' + RELATION_SUBDOMAIN + '.relationapp.jp';

// 共通検索条件（全自治体統一）
var COMMON_SEARCH_CONDITIONS = {
  status_cds: ["open"],
  per_page: 50,
  page: 1
};

/**
 * 共通検索条件を取得
 * @return {Object} 検索条件オブジェクト
 */
function getCommonSearchConditions() {
  return COMMON_SEARCH_CONDITIONS;
}

/**
 * re:lation APIのベースURLを取得
 * @return {string} ベースURL
 */
function getRelationBaseUrl() {
  return RELATION_BASE_URL;
}

/**
 * re:lation APIキーを取得
 * @return {string} APIキー
 */
function getRelationApiKey() {
  return PropertiesService.getScriptProperties().getProperty('RELATION_API_KEY');
}

/**
 * チケット検索APIのURLを生成
 * @param {string} messageBoxId 受信箱ID
 * @return {string} チケット検索API URL
 */
function buildTicketSearchUrl(messageBoxId) {
  return RELATION_BASE_URL + '/api/v2/' + messageBoxId + '/tickets/search';
}

/**
 * チケット分類APIのURLを生成
 * @param {string} messageBoxId 受信箱ID
 * @return {string} チケット分類API URL
 */
function buildCaseCategoriesUrl(messageBoxId) {
  return RELATION_BASE_URL + '/api/v2/' + messageBoxId + '/case_categories';
}

/**
 * ラベルAPIのURLを生成
 * @param {string} messageBoxId 受信箱ID
 * @return {string} ラベルAPI URL
 */
function buildLabelsUrl(messageBoxId) {
  return RELATION_BASE_URL + '/api/v2/' + messageBoxId + '/labels';
}

/**
 * メッセージボックス一覧APIのURLを生成
 * @return {string} メッセージボックス一覧API URL
 */
function buildMessageBoxesUrl() {
  return RELATION_BASE_URL + '/api/v2/message_boxes';
}

/**
 * チケット詳細URLを生成
 * @param {string} messageBoxId 受信箱ID
 * @param {string} ticketId チケットID
 * @param {string} status チケットステータス（'open' または 'closed'）
 * @return {string} チケット詳細URL
 */
function buildTicketUrl(messageBoxId, ticketId, status) {
  status = status || 'open';
  return RELATION_BASE_URL + '/tickets/#/' + messageBoxId + '/tickets/' + status + '/p1/' + ticketId;
}

/**
 * チケット詳細APIのURLを生成
 * @param {string} messageBoxId 受信箱ID
 * @param {string} ticketId チケットID
 * @return {string} チケット詳細API URL
 */
function buildTicketDetailUrl(messageBoxId, ticketId) {
  return RELATION_BASE_URL + '/api/v2/' + messageBoxId + '/tickets/' + ticketId;
}
