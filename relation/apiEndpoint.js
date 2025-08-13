/**
 * re:lation連携システム 定数定義とAPI関数
 */

// re:lation API設定
var RELATION_BASE_URL = 'https://steamship.relationapp.jp';

// デフォルト検索条件
var DEFAULT_SEARCH_CONDITIONS = {
  status_cds: ["open"],
  per_page: 50,
  page: 1
};

/**
 * re:lation APIエンドポイントを取得
 * @param {string} type エンドポイントタイプ
 * @param {Object} params パラメータ
 * @return {string} 完全なAPIエンドポイントURL
 */
function getRelationEndpoint(type, params = {}) {
  const baseUrl = RELATION_BASE_URL;
  const { messageBoxId, ticketId, status = 'open' } = params;
  
  switch (type) {
    case 'tickets_search':
      return `${baseUrl}/api/v2/${messageBoxId}/tickets/search`;
      
    case 'ticket_detail':
      return `${baseUrl}/api/v2/${messageBoxId}/tickets/${ticketId}`;
      
    case 'case_categories':
      return `${baseUrl}/api/v2/${messageBoxId}/case_categories`;
      
    case 'labels':
      return `${baseUrl}/api/v2/${messageBoxId}/labels`;
      
    case 'message_boxes':
      return `${baseUrl}/api/v2/message_boxes`;
      
    case 'ticket_web_url':
      return `${baseUrl}/tickets/#/${messageBoxId}/tickets/${status}/p1/${ticketId}`;
      
    default:
      throw new Error(`未対応のエンドポイントタイプ: ${type}`);
  }
}

/**
 * re:lation APIキーを取得
 * @return {string} APIキー
 */
function getRelationApiKey() {
  return PropertiesService.getScriptProperties().getProperty('RELATION_API_KEY');
}
