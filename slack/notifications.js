/**
 * Slack通知用コアモジュール
 * 自動通知とAPI通信を担当
 */

/**
 * Slack通知を送信する関数
 * @param {Array} tickets チケット配列
 * @param {Object} config 自治体設定オブジェクト（オプション）
 */
function sendSlack(tickets, config) {
  // Bot Tokenを取得
  var slackBotToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
  
  if (!slackBotToken) {
    console.log('SLACK_BOT_TOKENが設定されていません。スクリプトプロパティに設定してください。');
    return {
      success: false,
      message: 'SLACK_BOT_TOKENが設定されていません。スクリプトプロパティに設定してください。',
      error: 'token_not_configured'
    };
  }

  // 設定が渡されていない場合はエラー
  if (!config) {
    console.log('自治体設定が指定されていません');
    return {
      success: false,
      message: '自治体設定が指定されていません',
      error: 'config_not_provided'
    };
  }
  
  console.log('Bot Token使用: ' + config.slackChannel + ' に送信');
  return sendWithBotToken(tickets, config, slackBotToken);
}

/**
 * Bot Tokenを使用してSlack送信
 */
function sendWithBotToken(tickets, config, botToken) {
  var message = createSlackMessage(tickets, config);
  
  // チャンネル名をそのまま使用（#付きも対応）
  var channelName = config.slackChannel;
  
  // 送信先の種類を判定してログ出力
  var channelType = '';
  if (channelName.startsWith('U')) {
    channelType = 'ユーザーID（DM送信）';
  } else if (channelName.startsWith('C')) {
    channelType = 'チャンネルID';
  } else if (channelName.startsWith('D')) {
    channelType = 'DMチャンネルID';
  } else if (channelName.startsWith('G')) {
    channelType = 'グループDMチャンネルID';
  } else if (channelName.startsWith('#')) {
    channelType = 'チャンネル名（#付き）';
  } else {
    // 日本語チャンネル名の場合の処理
    var hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(channelName);
    if (hasJapanese) {
      channelType = '日本語チャンネル名';
    } else {
      channelType = '英語チャンネル名';
    }
  }
  console.log('送信先タイプ: ' + channelType + ' / 送信先値: "' + channelName + '"');
  
  // チャンネル名をそのまま使用して送信
  var result = attemptSlackSend(channelName, message, botToken, channelType);
  
  return result;
}

/**
 * Slack送信を試行する内部関数
 * @param {string} channel チャンネル名
 * @param {string} message メッセージ
 * @param {string} botToken ボットトークン
 * @param {string} description 試行の説明
 * @return {boolean} 送信成功かどうか
 */
function attemptSlackSend(channel, message, botToken, description) {
  
  var payload = {
    channel: channel,
    text: message
  };
  
  try {
    var response = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + botToken,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    });
    
    var result = JSON.parse(response.getContentText());
    
    if (result.ok) {
      console.log('✅ Slack通知送信成功（' + description + ' - 送信先: ' + channel + '）');
      return {
        success: true,
        message: 'Slack通知送信成功',
        details: result
      };
    } else {
      console.error('Bot Token送信エラー: ' + result.error);
      var errorMessage = 'Slack送信エラー: ' + result.error;
      
      // エラーに応じた詳細メッセージを追加
      if (result.error === 'not_in_channel') {
        errorMessage += '\n\n対処法: ボットをチャンネルに招待してください。\n1. Slackでチャンネルを開く\n2. /invite @re:lation Bot を実行\n3. またはチャンネル設定からメンバーに追加';
      } else if (result.error === 'channel_not_found') {
        errorMessage += '\n\n対処法: チャンネル名を確認してください。\n- チャンネル名は正確に入力してください\n- プライベートチャンネルの場合は、ボットが招待されている必要があります';
      } else if (result.error === 'invalid_auth') {
        errorMessage += '\n\n対処法: Bot Tokenを確認してください。\n- スクリプトプロパティのSLACK_BOT_TOKENが正しく設定されているか確認\n- Tokenの有効期限が切れていないか確認';
      }
      
      return {
        success: false,
        message: errorMessage,
        error: result.error,
        details: result
      };
    }
  } catch (error) {
    console.error('Bot Token送信失敗: ' + error.toString());
    return {
      success: false,
      message: 'Slack API呼び出しでエラーが発生しました: ' + error.toString(),
      error: 'api_call_failed',
      details: { error: error.toString() }
    };
  }
}

/**
 * レート制限を考慮したSlack通知送信（60自治体対応）
 * @param {Array} tickets チケット配列
 * @param {Object} config 自治体設定
 * @param {boolean} isLast 最後の送信かどうか
 */
function sendSlackWithRateLimit(tickets, config, isLast) {
  sendSlack(tickets, config);
  
  // 最後の送信でない場合は待機
  if (!isLast) {
    // Webhook: 1.1秒間隔（安全マージン込み）
    // Bot Token: 1.5秒間隔（40回/分 = 安全）
    Utilities.sleep(1500); // 1.5秒待機
  }
}

/**
 * 自治体別Slack通知を送信（フィルタ条件適用）
 * @param {Array} tickets チケット配列
 * @param {Object} config 自治体設定
 * @param {boolean} isLast 最後の送信かどうか
 */
function sendSlackToMunicipality(tickets, config, isLast) {
  console.log(`自治体名: ${config.name} / Slackチャンネル: ${config.slackChannel} / チケット数（フィルタ前）: ${tickets.length}`);
  
  // Slack通知フィルタ条件を適用
  var filteredTickets = applySlackNotificationFilter(tickets, config);
  
  console.log('チケット数（フィルタ後）: ' + filteredTickets.length);
  console.log('フィルタ条件: ' + JSON.stringify(config.slackNotificationFilter));
  
  // フィルタ条件に該当するチケットがある場合のみ通知
  if (filteredTickets.length > 0) {
    sendSlackWithRateLimit(filteredTickets, config, isLast);
    console.log(config.name + ' へSlack通知送信: ' + filteredTickets.length + '件（フィルタ後）');
  } else {
    console.log(config.name + ' : Slack通知フィルタ条件に該当するチケットなし');
    
    // チケットがない場合も最後でなければ待機
    if (!isLast) {
      Utilities.sleep(1500);
    }
  }
}

/**
 * Slack通知フィルタ条件を適用
 * @param {Array} tickets チケット配列
 * @param {Object} config 自治体設定
 * @return {Array} フィルタ条件に該当するチケット配列
 */
function applySlackNotificationFilter(tickets, config) {
  // 設定シートからSlack通知フィルタ条件を取得
  var filterConditions = config.slackNotificationFilter;
  
  if (!filterConditions) {
    // フィルタ条件が設定されていない場合は全チケットを対象
    console.log('フィルタ条件なし - 全チケット対象');
    return tickets;
  }
  
  var filteredTickets = tickets.filter(function(ticket) {
    var shouldNotify = true;
    
    // ラベルIDフィルタ（含む）
    if (filterConditions.include_label_ids && filterConditions.include_label_ids.length > 0) {
      var hasIncludeLabel = filterConditions.include_label_ids.some(function(labelId) {
        return ticket.label_ids && ticket.label_ids.includes(labelId);
      });
      console.log('ラベルフィルタ結果: ' + hasIncludeLabel + ' (必要: ' + JSON.stringify(filterConditions.include_label_ids) + ')');
      if (!hasIncludeLabel) shouldNotify = false;
    }
    
    // チケット分類IDフィルタ（含む）
    if (filterConditions.include_case_category_ids && filterConditions.include_case_category_ids.length > 0) {
      var hasIncludeCategory = filterConditions.include_case_category_ids.some(function(categoryId) {
        return ticket.case_category_ids && ticket.case_category_ids.includes(categoryId);
      });
      console.log('分類フィルタ結果: ' + hasIncludeCategory + ' (必要: ' + JSON.stringify(filterConditions.include_case_category_ids) + ')');
      if (!hasIncludeCategory) shouldNotify = false;
    }
    
    return shouldNotify;
  });
  
  
  return filteredTickets;
}
