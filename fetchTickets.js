/**
 * 全自治体のオープンチケットを取得してシートに統合出力
 * メニューから呼び出される主要機能
 */
function fetchOpenTickets() {
  // 全自治体の設定を取得（Slackチャンネル未設定も含む）
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    throw new Error('受信箱設定が見つかりません。📮受信箱取得を先に実行してください。');
  }

  // シート初期化
  var sheetInfo = initializeSheet(
    CONSTANTS.SHEET_NAMES.OPEN_TICKETS,
    '🎫 未対応チケット',
    ['受信箱ID', '自治体名', 'ID', 'タイトル', 'ステータス', '担当者', '作成日', '更新日', 'チケット分類', 'ラベル', '保留理由ID', '色']
  );

  // チケット詳細サイドバーボタンを作成
  createTicketDetailButton(sheetInfo.sheet);

  // 初期進捗表示
  var configList = Object.keys(configs).map(function(municipalityId) {
    return configs[municipalityId];
  });
  updateProgress(sheetInfo.progressCell, 0, configList.length);

  function processTicketsForMunicipality(config, index) {
    try {
      var tickets = fetchTicketsForMunicipality(config, 'openTickets');
      
      // チケット分類とラベルのマップを取得
      var caseCategoriesMap = getCaseCategoriesMap(config.messageBoxId);
      var labelsMap = getLabelsMap(config.messageBoxId);
      
      // チケットデータを配列に変換（一括処理用）
      var ticketsData = tickets.map(function(ticket) {
        var caseCategoryIds = ticket.case_category_ids || [];
        var labelIds = ticket.label_ids || [];
        
        var categoryNames = getCategoryNames(caseCategoryIds, caseCategoriesMap);
        var labelNames = getLabelNames(labelIds, labelsMap);
        
        return [
          config.messageBoxId,        // 受信箱ID
          config.name,                // 自治体名
          ticket.ticket_id,           // ID
          ticket.title,               // タイトル
          ticket.status_name || '',   // ステータス
          ticket.assignee_name || '', // 担当者
          formatDate(ticket.created_at), // 作成日
          formatDate(ticket.updated_at), // 更新日
          categoryNames.join(', '),   // チケット分類
          labelNames.join(', '),      // ラベル
          ticket.hold_reason_id || '', // 保留理由ID
          ''                          // 色
        ];
      });

      // Slack通知（Slackチャンネル設定がある場合のみ）
      if (config.slackChannel) {
        var isLast = (index === configList.length - 1);
        sendSlackToMunicipality(tickets, config, isLast);
      }

      return {
        success: true,
        data: ticketsData
      };

    } catch (error) {
      console.error('チケット取得エラー - ' + config.name + ': ' + error.toString());
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  var result = processBatch(configList, processTicketsForMunicipality, {
    batchSize: CONSTANTS.BATCH_SIZE,
    waitTime: CONSTANTS.RATE_LIMIT_WAIT,
    progressCell: sheetInfo.progressCell,
    sheet: sheetInfo.sheet,
    startRow: sheetInfo.currentRow,
    columnCount: 12
  });

  // 結果表示
  var ui = SpreadsheetApp.getUi();
  var message = '全自治体チケット取得完了\n\n';
  message += '成功: ' + result.successCount + '件の自治体\n';
  message += '取得チケット総数: ' + result.allData.length + '件\n';
  
  if (result.errorList.length > 0) {
    message += 'エラー: ' + result.errorList.length + '件\n\n';
    message += 'エラー詳細:\n';
    for (var i = 0; i < Math.min(result.errorList.length, 5); i++) {
      message += '- ' + result.errorList[i].item.name + ': ' + result.errorList[i].error + '\n';
    }
    if (result.errorList.length > 5) {
      message += '他' + (result.errorList.length - 5) + '件\n';
    }
  }
  
  ui.alert('チケット取得完了', message, ui.ButtonSet.OK);
}

/**
 * 単一自治体のチケット取得
 * @param {Object} config 自治体設定
 * @param {string} ticketType 'openTickets'
 * @returns {Array} チケット配列
 */
function fetchTicketsForMunicipality(config, ticketType) {
  var result = fetchTicketsData(config, ticketType);
  
  if (!result.success) {
    throw new Error('チケット取得に失敗しました: ' + result.error);
  }
  
  return result.data;
}