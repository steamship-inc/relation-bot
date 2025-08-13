/**
 * Slack通知ヘルパー関数
 * 基本的な通知機能とメッセージ構築を担当
 */

/**
 * 基本的なSlack通知を送信
 * @param {string} message 送信するメッセージ
 * @param {Object} options 送信オプション
 * @return {boolean} 送信成功可否
 */
function sendBasicSlackNotification(message, options) {
  options = options || {};
  
  try {
    validateData(message, 'message', { required: true, type: 'string' });
    
    var webhookUrl = getSlackWebhookUrl();
    if (!webhookUrl) {
      console.warn('Slack Webhook URLが設定されていません');
      return false;
    }
    
    var payload = {
      text: message,
      username: options.username || 'relation-bot',
      channel: options.channel || getConstant('SLACK.DEFAULT_CHANNEL'),
      icon_emoji: options.icon_emoji || ':robot_face:'
    };
    
    // カスタムフィールドがあれば追加
    if (options.attachments) {
      payload.attachments = options.attachments;
    }
    
    if (options.blocks) {
      payload.blocks = options.blocks;
    }
    
    var response = UrlFetchApp.fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    });
    
    return response.getResponseCode() === 200;
    
  } catch (error) {
    console.error('Slack通知エラー:', error.toString());
    return false;
  }
}

/**
 * エラー専用のSlack通知
 * @param {string} errorMessage エラーメッセージ
 * @param {string} context エラーの発生コンテキスト
 * @param {Object} additionalInfo 追加情報
 */
function sendSlackErrorNotification(errorMessage, context, additionalInfo) {
  try {
    var message = ':warning: *エラーが発生しました*\n' +
                  '*コンテキスト:* ' + (context || '不明') + '\n' +
                  '*エラー内容:* ' + errorMessage;
    
    if (additionalInfo) {
      if (additionalInfo.fileName) {
        message += '\n*ファイル:* ' + additionalInfo.fileName;
      }
      if (additionalInfo.functionName) {
        message += '\n*関数:* ' + additionalInfo.functionName;
      }
      if (additionalInfo.timestamp) {
        message += '\n*発生時刻:* ' + additionalInfo.timestamp;
      }
    }
    
    sendBasicSlackNotification(message, {
      icon_emoji: ':warning:',
      channel: getConstant('SLACK.ERROR_CHANNEL') || getConstant('SLACK.DEFAULT_CHANNEL')
    });
    
  } catch (notificationError) {
    console.error('Slackエラー通知の送信に失敗:', notificationError.toString());
  }
}

/**
 * 成功メッセージ専用のSlack通知
 * @param {string} successMessage 成功メッセージ
 * @param {Object} details 詳細情報
 */
function sendSlackSuccessNotification(successMessage, details) {
  try {
    var message = ':white_check_mark: *処理が完了しました*\n' + successMessage;
    
    if (details) {
      if (details.processedCount !== undefined) {
        message += '\n*処理件数:* ' + details.processedCount + '件';
      }
      if (details.duration) {
        message += '\n*処理時間:* ' + details.duration;
      }
      if (details.summary) {
        message += '\n*概要:* ' + details.summary;
      }
    }
    
    sendBasicSlackNotification(message, {
      icon_emoji: ':white_check_mark:',
      channel: getConstant('SLACK.SUCCESS_CHANNEL') || getConstant('SLACK.DEFAULT_CHANNEL')
    });
    
  } catch (notificationError) {
    console.error('Slack成功通知の送信に失敗:', notificationError.toString());
  }
}

/**
 * 進捗報告専用のSlack通知
 * @param {string} processName プロセス名
 * @param {number} currentCount 現在の処理数
 * @param {number} totalCount 全体の処理数
 * @param {Object} options オプション
 */
function sendSlackProgressNotification(processName, currentCount, totalCount, options) {
  options = options || {};
  
  try {
    var percentage = Math.round((currentCount / totalCount) * 100);
    var progressBar = createProgressBar(percentage);
    
    var message = ':hourglass_flowing_sand: *' + processName + '* 進捗状況\n' +
                  progressBar + ' ' + percentage + '%\n' +
                  '(' + currentCount + '/' + totalCount + ')';
    
    if (options.estimatedTime) {
      message += '\n*予想残り時間:* ' + options.estimatedTime;
    }
    
    if (options.details) {
      message += '\n*詳細:* ' + options.details;
    }
    
    sendBasicSlackNotification(message, {
      icon_emoji: ':hourglass_flowing_sand:',
      channel: options.channel || getConstant('SLACK.PROGRESS_CHANNEL') || getConstant('SLACK.DEFAULT_CHANNEL')
    });
    
  } catch (notificationError) {
    console.error('Slack進捗通知の送信に失敗:', notificationError.toString());
  }
}

/**
 * プログレスバーの作成
 * @param {number} percentage パーセンテージ（0-100）
 * @return {string} プログレスバー文字列
 */
function createProgressBar(percentage) {
  var filledBlocks = Math.floor(percentage / 10);
  var emptyBlocks = 10 - filledBlocks;
  
  return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
}

/**
 * Slack Webhook URLを取得
 * @return {string|null} Webhook URL
 */
function getSlackWebhookUrl() {
  return PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
}

/**
 * チケット情報をSlack形式でフォーマット
 * @param {Object} ticket チケット情報
 * @return {Object} Slack添付ファイル形式
 */
function formatTicketForSlack(ticket) {
  var attachment = {
    color: getTicketColorByStatus(ticket.status),
    title: 'チケット #' + ticket.ticket_id,
    title_link: ticket.url,
    fields: [
      {
        title: 'ステータス',
        value: ticket.status || '不明',
        short: true
      },
      {
        title: 'カテゴリ',
        value: ticket.case_category_name || '未分類',
        short: true
      },
      {
        title: '自治体',
        value: ticket.municipality_name || '不明',
        short: true
      },
      {
        title: '作成日',
        value: formatDate(ticket.created_at),
        short: true
      }
    ]
  };
  
  if (ticket.subject) {
    attachment.fields.push({
      title: '件名',
      value: ticket.subject.length > 100 ? ticket.subject.substring(0, 100) + '...' : ticket.subject,
      short: false
    });
  }
  
  return attachment;
}

/**
 * ステータスに応じた色を取得
 * @param {string} status ステータス
 * @return {string} カラーコード
 */
function getTicketColorByStatus(status) {
  var statusColors = {
    'open': '#ff4444',      // 赤
    'in_progress': '#ffaa00', // オレンジ
    'pending': '#ffdd00',   // 黄色
    'closed': '#44ff44',    // 緑
    'resolved': '#44ff44',  // 緑
    'cancelled': '#888888'  // グレー
  };
  
  return statusColors[status] || '#dddddd';
}

/**
 * 日付をフォーマット
 * @param {string} dateString 日付文字列
 * @return {string} フォーマット済み日付
 */
function formatDate(dateString) {
  if (!dateString) return '不明';
  
  try {
    var date = new Date(dateString);
    return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  } catch (error) {
    return dateString;
  }
}
