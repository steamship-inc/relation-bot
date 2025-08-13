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
  
  var message = template.headerTemplate
    .replace('{municipalityName}', config.name)
    .replace('{totalCount}', totalCount);
  
  for (var i = 0; i < totalCount; i++) {
    var ticket = tickets[i];
    var ticketUrl = buildTicketUrl(messageBoxId, ticket.ticket_id, 'open');
    
    // チケット分類とラベルの表示
    var categoryNames = (ticket.case_category_names && ticket.case_category_names.length > 0) 
      ? ticket.case_category_names.join(', ') 
      : 'なし';
    var labelNames = (ticket.label_names && ticket.label_names.length > 0) 
      ? ticket.label_names.join(', ') 
      : 'なし';
    
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
    headerTemplate: '🏛 *{municipalityName}*\n\n' +
                    '🎫未対応チケット({totalCount}件)\n\n',
    ticketItemTemplate: '• <{ticketUrl}|#{ticketId}> {title}\n' +
                        '  作成: {createdAt}  更新: {updatedAt}\n' +
                        '  🏷️ 分類: {categoryNames}  🔖 ラベル: {labelNames}\n',
    footerMessage: '\n💡 詳細はスプレッドシートをご確認ください'
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
