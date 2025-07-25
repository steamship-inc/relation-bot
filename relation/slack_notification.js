/**
 * Slack通知のテスト関数
 * @param {string} customMessage カスタムメッセージ（オプション）
 * @param {string} channel 送信先チャンネル（オプション）
 */
function testSendSlack(customMessage, channel) {
  var ui = SpreadsheetApp.getUi();
  
  try {
    // スクリプトプロパティからSlack Webhook URLを取得
    var slackWebhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
    if (!slackWebhookUrl) {
      ui.alert('エラー', 'Slack Webhook URLが設定されていません', ui.ButtonSet.OK);
      return;
    }

    // デフォルトメッセージまたはカスタムメッセージを使用
    var message = customMessage || '🔧 re:lation連携システムの動作テストです\n\n✅ Slack通知機能は正常に動作しています';

    var payload = {
      text: message
    };

    if (channel) {
      payload.channel = channel;
    }

    // Slackに通知送信
    UrlFetchApp.fetch(slackWebhookUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    });
    
    console.log('Slack通知テストを送信しました');
    ui.alert('成功', 'Slack通知のテストメッセージを送信しました。', ui.ButtonSet.OK);
  } catch (error) {
    console.error('Slack通知テストの送信に失敗しました: ' + error.toString());
    ui.alert('エラー', 'Slack通知の送信に失敗しました: ' + error.toString(), ui.ButtonSet.OK);
  }
}


/**
 * Slack通知を送信する関数
 * @param {Array} tickets チケット配列
 */
function sendSlack(tickets) {
  // スクリプトプロパティからSlack Webhook URLを取得
  var slackWebhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
  
  if (!slackWebhookUrl) {
    console.log('Slack Webhook URLが設定されていません');
    return;
  }

  // 通知メッセージを作成
  var message = createSlackMessage(tickets);
  
  // Slackに通知送信
  var payload = {
    text: message
  };

  try {
    UrlFetchApp.fetch(slackWebhookUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    });
    console.log('Slack通知を送信しました');
  } catch (error) {
    console.error('Slack通知の送信に失敗しました: ' + error.toString());
  }
}

/**
 * Slackメッセージを作成する関数
 * @param {Array} tickets チケット配列
 * @return {string} Slack用のフォーマットされたメッセージ
 */
function createSlackMessage(tickets) {
  var totalCount = tickets.length;
  var subdomain = 'steamship';
  var messageBoxId = '629';
  
  if (totalCount === 0) {
    return '✅ 未対応チケットはありません！';
  }
  
  var message = '🎫 *未対応チケット状況報告*\n\n';
  message += `📊 未対応チケット数: *${totalCount}件*\n\n`;
  
  // 上位5件のチケットを詳細表示
  var displayCount = Math.min(totalCount, 5);
  message += '📋 *最新チケット（上位' + displayCount + '件）:*\n';
  
  for (var i = 0; i < displayCount; i++) {
    var ticket = tickets[i];
    var ticketUrl = 'https://' + subdomain + '.relationapp.jp/tickets/#/' + messageBoxId + '/tickets/open/p1/' + ticket.ticket_id + '?order=desc&order_by';
    
    message += `• <${ticketUrl}|#${ticket.ticket_id}> ${ticket.title}\n`;
    message += `  作成: ${formatDate(ticket.created_at)} | 更新: ${formatDate(ticket.last_updated_at)}\n`;
  }
  
  if (totalCount > 5) {
    message += `\n... 他 ${totalCount - 5}件のチケットがあります\n`;
  }
  
  message += '\n💡 詳細はスプレッドシートをご確認ください';
  
  return message;
}

/**
 * 日時をフォーマットする関数
 * @param {string} isoString ISO8601形式の日時文字列
 * @return {string} フォーマットされた日時文字列 (MM/dd HH:mm)
 */
function formatDate(isoString) {
  var date = new Date(isoString);
  return Utilities.formatDate(date, 'Asia/Tokyo', 'MM/dd HH:mm');
}
