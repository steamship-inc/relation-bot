/**
 * チケット通知サービス (Slack通知フィルタリング機能)
 */

/**
 * 自治体にSlack通知を送信する
 * @param {Array} tickets チケット配列
 * @param {Object} config 自治体設定
 * @param {boolean} isLast 最後の送信かどうか
 */
function sendSlackToMunicipality(tickets, config, isLast) {
  // Slack通知フィルタ条件を適用
  var filteredTickets = applySlackNotificationFilter(tickets, config);
  
  // フィルタ条件に該当するチケットがある場合のみ通知
  if (filteredTickets.length > 0) {
    sendSlackWithRateLimit(filteredTickets, config, isLast);
  } else {
    // チケットがない場合も最後でなければ待機
    if (!isLast) {
      Utilities.sleep(CONSTANTS.API_WAIT_TIME);
    }
  }
}

/**
 * Slack通知フィルタ条件を適用
 * @param {Array} tickets チケット配列
 * @param {Object} config 自治体設定
 * @returns {Array} フィルタ条件に該当するチケット配列
 */
function applySlackNotificationFilter(tickets, config) {
  // 設定シートからSlack通知フィルタ条件を取得
  var filterConditions = config.slackNotificationFilter;
  
  if (!filterConditions) {
    // フィルタ条件が設定されていない場合は全チケットを対象
    return tickets;
  }
  
  return tickets.filter(function(ticket) {
    var shouldNotify = true;
    
    // ラベルIDフィルタ（含む）
    if (filterConditions.include_label_ids && filterConditions.include_label_ids.length > 0) {
      var hasIncludeLabel = filterConditions.include_label_ids.some(function(labelId) {
        return ticket.label_ids && ticket.label_ids.includes(labelId);
      });
      if (!hasIncludeLabel) shouldNotify = false;
    }
    
    // ラベルIDフィルタ（除く）
    if (filterConditions.exclude_label_ids && filterConditions.exclude_label_ids.length > 0) {
      var hasExcludeLabel = filterConditions.exclude_label_ids.some(function(labelId) {
        return ticket.label_ids && ticket.label_ids.includes(labelId);
      });
      if (hasExcludeLabel) shouldNotify = false;
    }
    
    // チケット分類IDフィルタ（含む）
    if (filterConditions.include_case_category_ids && filterConditions.include_case_category_ids.length > 0) {
      var hasIncludeCategory = filterConditions.include_case_category_ids.some(function(categoryId) {
        return ticket.case_category_ids && ticket.case_category_ids.includes(categoryId);
      });
      if (!hasIncludeCategory) shouldNotify = false;
    }
    
    // チケット分類IDフィルタ（除く）
    if (filterConditions.exclude_case_category_ids && filterConditions.exclude_case_category_ids.length > 0) {
      var hasExcludeCategory = filterConditions.exclude_case_category_ids.some(function(categoryId) {
        return ticket.case_category_ids && ticket.case_category_ids.includes(categoryId);
      });
      if (hasExcludeCategory) shouldNotify = false;
    }
    
    // 優先度フィルタ
    if (filterConditions.priority_levels && filterConditions.priority_levels.length > 0) {
      if (!filterConditions.priority_levels.includes(ticket.priority_level)) {
        shouldNotify = false;
      }
    }
    
    return shouldNotify;
  });
}