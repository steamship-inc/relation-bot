/**
 * 手動送信コアモジュール
 * 手動送信のメインロジックとUIダイアログを担当
 * 
 * 依存関係:
 * - slack/data-fetcher.js: loadMunicipalityConfigFromSheet(), getTicketsFromSheet()
 * - slack/notifications.js: sendSlack()
 */

/**
 * 検索可能なHTMLダイアログで自治体を選択
 * @param {Object} configs 全自治体設定
 * @return {Object|null} 選択された自治体設定
 */
function selectMunicipalityWithSearchableDialog(configs) {
  try {
    var configIds = Object.keys(configs);
    
    // 自治体リストのHTMLを事前に生成
    var municipalityItemsHtml = '';
    for (var i = 0; i < configIds.length; i++) {
      var config = configs[configIds[i]];
      municipalityItemsHtml += '<div class="municipality-item" onclick="selectMunicipality(\'' + configIds[i] + '\')" data-id="' + configIds[i] + '">';
      municipalityItemsHtml += '<div class="municipality-name">' + config.name + '</div>';
      municipalityItemsHtml += '<div class="municipality-channel">' + config.slackChannel + '</div>';
      municipalityItemsHtml += '</div>';
    }

    // HTMLテンプレートを使用してページを作成
    var htmlTemplate = HtmlService.createTemplateFromFile('slack/sendUI/manualSend');
    
    // テンプレート変数を設定
    htmlTemplate.configs = configs;
    htmlTemplate.municipalityItemsHtml = municipalityItemsHtml;
    
    var htmlOutput = htmlTemplate.evaluate()
      .setWidth(700)
      .setHeight(600);
    
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, '受信箱選択');
    
    console.log('ダイアログ表示完了');
    
    // ダイアログの結果を待つ必要なし - processSelectedMunicipality が直接処理する
    return null; // この戻り値は使われない
  } catch (error) {
    console.error('検索可能ダイアログエラー: ' + error.toString());
    throw error; // エラーを再スローして呼び出し元に伝える
  }
}

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
 * @return {Object} 送信結果情報（フィルタ適用状況含む）
 */
function processSelectedMunicipality(municipalityCode) {
  try {
    console.log('自治体選択処理開始: ' + municipalityCode);
    
    // 全自治体設定を取得（フィルタ設定を含む）
    var configs = loadMunicipalityConfigFromSheet();
    var selectedConfig = configs[municipalityCode];
    
    if (!selectedConfig) {
      throw new Error('選択された自治体設定が見つかりません: ' + municipalityCode);
    }
    
    // フィルタ設定のデバッグログ
    if (selectedConfig.slackNotificationFilter) {
      console.log(
      '自治体: ' + selectedConfig.name +
      ' / フィルタ設定: ' + JSON.stringify(selectedConfig.slackNotificationFilter) +
      ' / フィルタ有効 - 条件に該当するチケットのみ送信します'
      );
    } else {
      console.log(
      '自治体: ' + selectedConfig.name +
      ' / フィルタ設定: なし / フィルタなし - 全チケットを送信します'
      );
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
      return {
        success: false,
        reason: 'no_tickets',
        municipalityName: selectedConfig.name,
        originalCount: 0,
        filteredCount: 0,
        filterSettings: selectedConfig.slackNotificationFilter
      };
    }
    
    // フィルタ適用前の件数を記録
    var originalCount = tickets.length;
    
    // フィルタリングを手動で適用して結果を確認
    var filteredTickets = applySlackNotificationFilter(tickets, selectedConfig);
    var filteredCount = filteredTickets.length;
    
    // 実際のチケットで通知送信（フィルタリング適用）
    // sendSlackToMunicipality関数内でapplySlackNotificationFilter()が呼び出され、
    // selectedConfig.slackNotificationFilterの設定に基づいてチケットがフィルタリングされます
    console.log('=== Slack手動送信開始 ===');
    console.log('対象自治体: ' + selectedConfig.name);
    console.log('チケット件数（フィルタ適用前）: ' + originalCount);
    console.log('チケット件数（フィルタ適用後）: ' + filteredCount);
    console.log('送信先: ' + selectedConfig.slackChannel);
    
    if (filteredCount === 0) {
      console.log('✅ 送信スキップ: フィルタ条件に該当するチケットがありません');
      return {
        success: true,
        reason: 'no_filtered_tickets',
        municipalityName: selectedConfig.name,
        originalCount: originalCount,
        filteredCount: 0,
        filterSettings: selectedConfig.slackNotificationFilter,
        slackChannel: selectedConfig.slackChannel
      };
    }
    
    // フィルタリングを適用した送信関数を使用（第3引数のtrueは最後の送信を意味）
    sendSlackToMunicipality(tickets, selectedConfig, true);
    
    return {
      success: true,
      reason: 'sent',
      municipalityName: selectedConfig.name,
      originalCount: originalCount,
      filteredCount: filteredCount,
      filterSettings: selectedConfig.slackNotificationFilter,
      slackChannel: selectedConfig.slackChannel
    };
    
  } catch (error) {
    console.error('自治体選択処理エラー: ' + error.toString());
    SpreadsheetApp.getUi().alert('エラー', '処理に失敗しました: ' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
    throw error;
  }
}
