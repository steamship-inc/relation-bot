/**
 * データアクセス層 - re:lation APIとの通信を担当
 */

/**
 * APIの基本設定を取得
 */
function getApiConfig() {
  return {
    apiKey: getRelationApiKey(),
    baseUrl: getRelationBaseUrl(),
    headers: {
      'Authorization': 'Bearer ' + getRelationApiKey(),
      'Content-Type': 'application/json'
    }
  };
}

/**
 * 自治体のチケット分類を取得する
 * @param {Object} config 自治体設定
 * @returns {Object} 取得結果
 */
function fetchCaseCategoriesData(config) {
  return handleApiCall(function() {
    var apiUrl = buildCaseCategoriesUrl(config.messageBoxId);
    var params = '?per_page=100&page=1';
    var apiConfig = getApiConfig();

    var response = UrlFetchApp.fetch(apiUrl + params, {
      method: 'get',
      headers: apiConfig.headers
    });

    var responseData = JSON.parse(response.getContentText());
    return responseData.data || [];
  }, 'チケット分類API', { municipalityName: config.name });
}

/**
 * 自治体のラベルを取得する
 * @param {Object} config 自治体設定
 * @returns {Object} 取得結果
 */
function fetchLabelsData(config) {
  return handleApiCall(function() {
    var apiUrl = buildLabelsUrl(config.messageBoxId);
    var params = '?per_page=100&page=1';
    var apiConfig = getApiConfig();

    var response = UrlFetchApp.fetch(apiUrl + params, {
      method: 'get',
      headers: apiConfig.headers
    });

    var responseData = JSON.parse(response.getContentText());
    return responseData.data || [];
  }, 'ラベルAPI', { municipalityName: config.name });
}

/**
 * 自治体のチケットを取得する
 * @param {Object} config 自治体設定
 * @param {string} ticketType チケットタイプ
 * @returns {Object} 取得結果
 */
function fetchTicketsData(config, ticketType) {
  return handleApiCall(function() {
    var apiUrl = buildTicketSearchUrl(config.messageBoxId);
    var searchConditions = getCommonSearchConditions();
    var apiConfig = getApiConfig();

    var response = UrlFetchApp.fetch(apiUrl, {
      method: 'post',
      headers: apiConfig.headers,
      payload: JSON.stringify(searchConditions)
    });

    var responseData = JSON.parse(response.getContentText());
    return responseData.data || [];
  }, 'チケット検索API', { municipalityName: config.name });
}

/**
 * チケット詳細を取得する
 * @param {number} messageBoxId メッセージボックスID
 * @param {number} ticketId チケットID
 * @returns {Object} 取得結果
 */
function fetchTicketDetailData(messageBoxId, ticketId) {
  return handleApiCall(function() {
    var apiUrl = buildTicketDetailUrl(messageBoxId, ticketId);
    var apiConfig = getApiConfig();

    var response = UrlFetchApp.fetch(apiUrl, {
      method: 'get',
      headers: apiConfig.headers
    });

    return JSON.parse(response.getContentText());
  }, 'チケット詳細API', { ticketId: ticketId });
}