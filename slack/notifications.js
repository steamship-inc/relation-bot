/**
 * Slack通知用コアモジュール
 * メイン送信ロジックとAPI通信を担当
 */

/**
 * 手動Slack送信関数
 * 選択した自治体の🎫未対応チケットシートのチケットを手動送信
 */
function manualSendSlack() {
  var ui = SpreadsheetApp.getUi();
  
  try {
    // Bot Tokenの確認
    var slackBotToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
    
    if (!slackBotToken) {
      ui.alert('エラー', 'SLACK_BOT_TOKENが設定されていません。スクリプトプロパティに設定してください。', ui.ButtonSet.OK);
      return;
    }

    // 🎫未対応チケットシートの存在確認
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var openTicketSheet = ss.getSheetByName('🎫未対応チケット');
    
    if (!openTicketSheet) {
      ui.alert('エラー', 
               '🎫未対応チケットシートが見つかりません。\n' +
               '先に「🟩 re:lation」→「🎫未対応チケット取得」を実行してください。', 
               ui.ButtonSet.OK);
      return;
    }

    // 全自治体設定を取得
    var configs = loadMunicipalityConfigFromSheet();
    
    if (Object.keys(configs).length === 0) {
      ui.alert('エラー', '受信箱設定が見つかりません。設定シートを確認してください。', ui.ButtonSet.OK);
      return;
    }
    
    // 自治体選択ダイアログ（検索可能セレクトボックス）
    // 注意: この関数は戻り値を返さず、選択後に直接 processSelectedMunicipality を呼び出す
    selectMunicipalityWithSearchableDialog(configs);
             
  } catch (error) {
    console.error('Slack手動送信エラー: ' + error.toString());
    ui.alert('エラー', 'Slack手動送信に失敗しました: ' + error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * HTMLダイアログから直接選択を処理して送信を実行
 * @param {string} municipalityCode 選択された自治体コード
 */
function processSelectedMunicipality(municipalityCode) {
  try {
    console.log('自治体選択処理開始: ' + municipalityCode);
    
    // 全自治体設定を取得
    var configs = loadMunicipalityConfigFromSheet();
    var selectedConfig = configs[municipalityCode];
    
    if (!selectedConfig) {
      throw new Error('選択された自治体設定が見つかりません: ' + municipalityCode);
    }
    
    console.log('=== ' + selectedConfig.name + 'のopenチケット取得開始（シートから） ===');
    
    // 🎫未対応チケットシートから該当自治体のチケットを取得
    var tickets = getTicketsFromSheet(selectedConfig.messageBoxId);
    
    if (!tickets || tickets.length === 0) {
      console.log('✅ 送信スキップ: 「' + selectedConfig.name + '」のopenチケットが見つかりません');
      console.log('最新データを取得するため「🟩 re:lation」→「🎫未対応チケット取得」を実行してください');
      
      SpreadsheetApp.getUi().alert('送信スキップ', 
                                  '「' + selectedConfig.name + '」はチケットがないため、送信をスキップしました。\n\n' +
                                  '最新データを取得するため「🟩 re:lation」→「🎫未対応チケット取得」を実行してください。', 
                                  SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // 実際のチケットで通知送信（確認ダイアログなしで即座に送信）
    console.log('=== Slack手動送信開始 ===');
    console.log('対象自治体: ' + selectedConfig.name);
    console.log('チケット件数: ' + tickets.length);
    console.log('送信先: ' + selectedConfig.slackChannel);
    
    var sendResult = sendSlack(tickets, selectedConfig);
    
    // 送信結果の処理（成功の場合はコンソールログのみ、エラーの場合のみダイアログ表示）
    if (sendResult && sendResult.success) {
      console.log('✅ 送信完了: 「' + selectedConfig.name + '」のopenチケット ' + tickets.length + '件を送信しました');
      console.log('送信先: ' + selectedConfig.slackChannel);
    } else {
      // 送信失敗の場合のみダイアログを表示
      var ui = SpreadsheetApp.getUi();
      var errorMessage = '「' + selectedConfig.name + '」のSlack通知送信に失敗しました。\n\n';
      errorMessage += '送信先: ' + selectedConfig.slackChannel + '\n';
      
      if (sendResult && sendResult.error) {
        errorMessage += 'エラー詳細: ' + sendResult.error + '\n';
        if (sendResult.errorResponse) {
          errorMessage += 'Slack APIレスポンス: ' + JSON.stringify(sendResult.errorResponse) + '\n';
        }
      }
      
      errorMessage += '\n対処方法:\n';
      errorMessage += '1) ボットがチャンネルに招待されているか確認\n';
      errorMessage += '2) チャンネル名が正確か確認\n';
      errorMessage += '3) Bot Tokenが有効か確認';
      
      ui.alert('送信失敗', errorMessage, ui.ButtonSet.OK);
      
      console.error('=== Slack送信失敗詳細 ===');
      console.error('自治体: ' + selectedConfig.name);
      console.error('送信先: ' + selectedConfig.slackChannel);
      if (sendResult) {
        console.error('エラー: ' + (sendResult.error || '不明'));
        console.error('レスポンス: ' + JSON.stringify(sendResult.errorResponse || {}));
      }
    }
    
  } catch (error) {
    console.error('自治体選択処理エラー: ' + error.toString());
    SpreadsheetApp.getUi().alert('エラー', '処理に失敗しました: ' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

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
  
  console.log('=== Slack送信デバッグ ===');
  console.log('送信先チャンネル: ' + config.slackChannel);
  console.log('メッセージ内容: ' + message);
  console.log('Bot Token長さ: ' + (botToken ? botToken.length : 'なし'));
  console.log('Bot Token開始文字: ' + (botToken ? botToken.substring(0, 10) + '...' : 'なし'));
  
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
  
  console.log('送信先タイプ: ' + channelType);
  console.log('送信先値: "' + channelName + '"');
  console.log('送信先文字数: ' + channelName.length);
  
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
  console.log('=== attemptSlackSend デバッグ開始 ===');
  console.log('チャンネル: "' + channel + '"');
  console.log('説明: ' + description);
  console.log('メッセージ長: ' + message.length);
  console.log('ボットトークン存在: ' + (botToken ? 'あり' : 'なし'));
  
  var payload = {
    channel: channel,
    text: message
  };
  
  console.log('送信ペイロード: ' + JSON.stringify(payload));

  try {
    console.log('Slack API呼び出し開始...');
    var response = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + botToken,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    });
    
    console.log('Slack API レスポンス受信完了');
    console.log('レスポンス ステータス: ' + response.getResponseCode());
    console.log('レスポンス ヘッダー: ' + JSON.stringify(response.getHeaders()));
    
    var result = JSON.parse(response.getContentText());
    console.log('Slack API レスポンス (' + description + '): ' + JSON.stringify(result));
    
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
