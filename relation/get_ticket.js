/**
 * 全自治体のオープンチケットを取得してシートに統合出力
 * メニューから呼び出される主要機能
 */
function fetchAllMunicipalitiesOpenTickets() {
  var ui = SpreadsheetApp.getUi();
  var configs = getAllMunicipalityConfigs();

  
  // 開始前に📊openTicketシートを初期化
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('📊openTicket');
  
  if (!sheet) {
    sheet = ss.insertSheet('📊openTicket');
  } else {
    sheet.clear();
  }
  
  // ヘッダー行を設定
  sheet.appendRow(['自治体名', 'ID', 'タイトル', 'ステータス', '作成日', '更新日', 'チケット分類ID', 'ラベルID', '保留理由ID']);
  
  var successCount = 0;
  var errorList = [];
  var totalTickets = 0;
  
  // 各自治体のチケットを順次取得・統合
  var configIds = Object.keys(configs);
  var totalConfigs = configIds.length;
  
  for (var i = 0; i < configIds.length; i++) {
    var id = configIds[i];
    var isLast = (i === configIds.length - 1);
    
    try {
      var config = configs[id];
      var tickets = fetchTicketsForMunicipality(config, 'openTickets');
      
      // シートに追記
      tickets.forEach(function(ticket) {
        var rowData = [
          config.name,                // 自治体名
          ticket.ticket_id,           // チケットID
          ticket.title,               // タイトル
          ticket.status_cd,           // ステータス
          ticket.created_at,          // 作成日
          ticket.last_updated_at,     // 更新日
          ticket.case_category_ids ? ticket.case_category_ids.join(', ') : '',
          ticket.label_ids ? ticket.label_ids.join(', ') : '',
          ticket.pending_reason_id || ''
        ];
        
        sheet.appendRow(rowData);
        var rowIndex = sheet.getLastRow();
        
        // チケットURLとリンク設定
        var ticketUrl = buildTicketUrl(config.messageBoxId, ticket.ticket_id, 'open');
        var richText = SpreadsheetApp.newRichTextValue()
          .setText(ticket.title)
          .setLinkUrl(ticketUrl)
          .build();
        
        sheet.getRange(rowIndex, 3).setRichTextValue(richText);
      });
      
      totalTickets += tickets.length;
      successCount++;
      
      console.log(config.name + ' のチケット取得完了: ' + tickets.length + '件');
      
      // 取得完了後、該当自治体にSlack通知を送信
      sendSlackToMunicipality(tickets, config, isLast);
      
    } catch (error) {
      errorList.push(configs[id].name + ': ' + error.toString());
      console.error(configs[id].name + ' のチケット取得エラー: ' + error.toString());
      
      // エラーの場合も最後でなければ待機（レート制限対応）
      if (!isLast) {
        Utilities.sleep(1500);
      }
    }
  }
  
  // 結果表示
  var message = '全自治体チケット取得完了\n\n';
  message += '成功: ' + successCount + '件の自治体\n';
  message += '取得チケット総数: ' + totalTickets + '件\n';
  if (errorList.length > 0) {
    message += 'エラー: ' + errorList.length + '件\n\n';
    message += errorList.join('\n');
  }
  
  ui.alert('実行結果', message, ui.ButtonSet.OK);
}

/**
 * 指定自治体のチケットを取得する共通関数
 * @param {Object} config 自治体設定
 * @param {string} ticketType 'openTickets'
 * @return {Array} チケット配列
 */
function fetchTicketsForMunicipality(config, ticketType) {
  // スクリプトプロパティからAPIキーを取得
  var apiKey = getRelationApiKey();

  // チケット検索APIのエンドポイント
  var apiUrl = buildTicketSearchUrl(config.messageBoxId);

  // 共通検索条件を取得（全自治体統一）
  var searchConditions = getCommonSearchConditions();
  var payload = {
    status_cds: searchConditions.status_cds,
    per_page: searchConditions.per_page,
    page: searchConditions.page
  };

  // 必要に応じて将来的に追加検索条件を設定可能
  // if (searchConditions.label_ids && searchConditions.label_ids.length > 0) {
  //   payload.label_ids = searchConditions.label_ids;
  // }

  // APIリクエスト（POST）
  var response = UrlFetchApp.fetch(apiUrl, {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  });

  // レスポンス（JSON配列）をパース
  return JSON.parse(response.getContentText());
}

/**
 * 自治体別Slack通知を送信（フィルタ条件適用）
 * @param {Array} tickets チケット配列
 * @param {Object} config 自治体設定
 * @param {boolean} isLast 最後の送信かどうか
 */
function sendSlackToMunicipality(tickets, config, isLast) {
  console.log('=== sendSlackToMunicipality デバッグ ===');
  console.log('自治体名: ' + config.name);
  console.log('Slackチャンネル: ' + config.slackChannel);
  console.log('チケット数（フィルタ前）: ' + tickets.length);
  
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

/**
 * ID文字列をパースして配列に変換
 * @param {string} idsString カンマ区切りのID文字列
 * @return {Array} ID配列
 */
function parseIds(idsString) {
  if (!idsString || idsString === '') {
    return [];
  }
  
  try {
    // カンマ区切りの文字列を配列に変換
    return idsString.toString().split(',').map(function(id) {
      return parseInt(id.trim());
    }).filter(function(id) {
      return !isNaN(id);
    });
  } catch (error) {
    console.error('ID解析エラー: ' + error.toString());
    return [];
  }
}


