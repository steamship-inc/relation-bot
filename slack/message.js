/**
 * Slack通知用メッセージ作成モジュール
 * Slackメッセージの生成とテンプレート管理を担当
 */

/**
 * Slackメッセージを作成する関数
 * @param {Array} tickets チケット配列
 * @param {Object} config 自治体設定オブジェクト
 * @return {string} Slack用のフォーマットされたメッセージ
 */
function createSlackMessage(tickets, config) {
  var totalCount = tickets.length;
  var messageBoxId = config.messageBoxId;
  
  // 自治体設定からSlack通知テンプレートを取得
  var template = getSlackMessageTemplate(config);
  
  if (totalCount === 0) {
    return template.noTicketsMessage.replace('{municipalityName}', config.name);
  }
  
  var message = template.headerTemplate
    .replace('{municipalityName}', config.name)
    .replace('{totalCount}', totalCount);
  
  // 上位指定件数のチケットを詳細表示
  var displayCount = Math.min(totalCount, template.maxDisplayCount || 5);
  message += template.ticketListHeader.replace('{displayCount}', displayCount);
  
  for (var i = 0; i < displayCount; i++) {
    var ticket = tickets[i];
    var ticketUrl = buildTicketUrl(messageBoxId, ticket.ticket_id, 'open');
    
    // チケット分類とラベルの表示
    var categoryNames = ticket.case_category_names.join(', ');
    var labelNames = ticket.label_names.join(', ');
    
    // 未設定の場合は「非表示」に変更
    if (categoryNames === '未設定') {
      categoryNames = '非表示';
    }
    if (labelNames === '未設定') {
      labelNames = '非表示';
    }
    
    var ticketLine = template.ticketItemTemplate
      .replace('{ticketUrl}', ticketUrl)
      .replace('{ticketId}', ticket.ticket_id)
      .replace('{title}', ticket.title)
      .replace('{createdAt}', formatDate(ticket.created_at))
      .replace('{updatedAt}', formatDate(ticket.last_updated_at))
      .replace('{categoryNames}', categoryNames)
      .replace('{labelNames}', labelNames);
    
    message += ticketLine;
  }
  
  if (totalCount > (template.maxDisplayCount || 5)) {
    var remaining = totalCount - (template.maxDisplayCount || 5);
    message += template.remainingTicketsMessage.replace('{remainingCount}', remaining);
  }
  
  message += template.footerMessage;
  
  return message;
}

/**
 * 自治体設定からSlack通知テンプレートを取得する関数
 * @param {Object} config 自治体設定オブジェクト
 * @return {Object} Slack通知テンプレート
 */
function getSlackMessageTemplate(config) {
  // デフォルトテンプレート
  var defaultTemplate = {
    headerTemplate: '🎫 *{municipalityName} - 未対応チケット状況報告*\n\n📊 未対応チケット数: *{totalCount}件*\n\n',
    ticketListHeader: '📋 *最新チケット（上位{displayCount}件）:*\n',
    ticketItemTemplate: '• <{ticketUrl}|#{ticketId}> {title}\n  作成: {createdAt} | 更新: {updatedAt}\n  分類: {categoryNames}\n  ラベル: {labelNames}\n',
    remainingTicketsMessage: '\n... 他 {remainingCount}件のチケットがあります\n',
    footerMessage: '\n💡 詳細はスプレッドシートをご確認ください',
    noTicketsMessage: '✅ {municipalityName} - 未対応チケットはありません！',
    maxDisplayCount: 5
  };
  
  // 自治体設定にSlack通知テンプレートが設定されている場合は使用
  if (config.slackTemplate) {
    try {
      var customTemplate = JSON.parse(config.slackTemplate);
      // デフォルト値とマージ
      return Object.assign(defaultTemplate, customTemplate);
    } catch (error) {
      console.error('Slack通知テンプレートのJSON解析に失敗しました: ' + error.toString());
      console.log('デフォルトテンプレートを使用します');
    }
  }
  
  return defaultTemplate;
}
