/**
 * 全自治体のオープンチケットを取得してシートに統合出力
 * メニューから呼び出される主要機能
 */
function fetchOpenTickets() {
  // 全自治体の設定を取得（Slackチャンネル未設定も含む）
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    throw new Error('自治体設定が見つかりません。📮受信箱一覧更新を先に実行してください。');
  }

  // 開始前に🎫未対応チケットシートを初期化
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('🎫未対応チケット');
  
  if (!sheet) {
    sheet = ss.insertSheet('🎫未対応チケット');
  } else {
    sheet.clear();
  }
  
  // 対象シートをアクティブにする
  ss.setActiveSheet(sheet);

  // A1セルにシートタイトルを表示
  var titleCell = sheet.getRange('A1');
  titleCell.setValue('🎫 未対応チケット');
  titleCell.setFontWeight('bold');
  SpreadsheetApp.flush();

  // 進捗表示用のセルを準備（C1セルに進捗を表示）
  var progressCell = sheet.getRange('C1');
  var totalMunicipalities = Object.keys(configs).length;
  progressCell.setValue('進捗: 0/' + totalMunicipalities);
  progressCell.setFontWeight('bold');
  SpreadsheetApp.flush(); // セル更新を即座に反映

  // ヘッダー行を5行目に追加
  sheet.getRange(5, 1, 1, 9).setValues([['自治体名', 'ID', 'タイトル', 'ステータス', '作成日', '更新日', 'チケット分類ID', 'ラベルID', '保留理由ID']]);
  sheet.getRange(5, 1, 1, 9).setFontWeight('bold');
  
  var successCount = 0;
  var errorList = [];
  var totalTickets = 0;
  var allTicketsData = []; // 全データを格納する配列
  var batchData = []; // 50自治体分のデータを一時保存
  var currentRow = 6; // データ開始行（ヘッダーの下）
  
  // 各自治体のチケットを順次取得・統合
  var configIds = Object.keys(configs);
  
  for (var i = 0; i < configIds.length; i++) {
    var municipalityId = configIds[i];
    var config = configs[municipalityId];
    
    // 50自治体ごとのバッチ開始時に進捗表示
    if (i % 50 === 0) {
      var batchStart = i + 1;
      var batchEnd = Math.min(i + 50, configIds.length);
      progressCell.setValue(batchStart + '-' + batchEnd + '/' + totalMunicipalities + ' 処理中');
      SpreadsheetApp.flush();
      console.log('50自治体バッチ開始: ' + batchStart + '-' + batchEnd + '/' + totalMunicipalities);
    }
    
    try {
      var tickets = fetchTicketsForMunicipality(config, 'openTickets');
      
      // チケットデータを配列に追加（一括処理用）
      tickets.forEach(function(ticket) {
        var ticketData = [
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
        allTicketsData.push(ticketData);
        batchData.push(ticketData);
      });
      
      totalTickets += tickets.length;
      successCount++;
      
      // 50自治体ごとにデータ書き込み
      if ((i + 1) % 50 === 0 || i === configIds.length - 1) {
        // 50自治体分のデータを書き込み
        if (batchData.length > 0) {
          var dataRange = sheet.getRange(currentRow, 1, batchData.length, 9);
          dataRange.setValues(batchData);
          
          // チケットURLとリンク設定（バッチ処理）
          for (var j = 0; j < batchData.length; j++) {
            var ticketRowData = batchData[j];
            var ticketId = ticketRowData[1]; // チケットID
            var title = ticketRowData[2]; // タイトル
            var municipalityName = ticketRowData[0]; // 自治体名
            
            // 自治体設定から受信箱IDを取得
            var ticketConfig = null;
            for (var configKey in configs) {
              if (configs[configKey].name === municipalityName) {
                ticketConfig = configs[configKey];
                break;
              }
            }
            
            if (ticketConfig) {
              var ticketUrl = buildTicketUrl(ticketConfig.messageBoxId, ticketId, 'open');
              var richText = SpreadsheetApp.newRichTextValue()
                .setText(title)
                .setLinkUrl(ticketUrl)
                .build();
              
              sheet.getRange(currentRow + j, 3).setRichTextValue(richText);
            }
          }
          
          currentRow += batchData.length;
          console.log('50自治体バッチ書き込み完了: ' + batchData.length + ' 件 (累計: ' + allTicketsData.length + ' 件)');
          batchData = []; // バッチデータをリセット
        }
      }
      
      // Slack通知（Slackチャンネル設定がある場合のみ）
      if (config.slackChannel) {
        sendSlackToMunicipality(tickets, config, false);
      }
      
    } catch (error) {
      errorList.push(config.name + ': ' + error.toString());
      console.error(config.name + ' のチケット取得エラー: ' + error.toString());
      
      // エラーの場合は必ず進捗表示を更新
      progressCell.setValue('進捗: ' + (i + 1) + '/' + totalMunicipalities + ' (エラー: ' + config.name + ')');
      SpreadsheetApp.flush(); // セル更新を即座に反映
    }
    
    // 50自治体ごとにレート制限回避のため待機
    // re:lation APIは1分間に60回制限なので、50自治体ごとに60秒待機で安全
    if ((i + 1) % 50 === 0 && i < configIds.length - 1) {
      console.log('50自治体処理完了 - レート制限回避のため60秒待機...');
      progressCell.setValue('API制限のため60秒待機');
      SpreadsheetApp.flush();
      Utilities.sleep(60000); // 60秒待機
    }
  }
  
  // 最終確認：残りのデータがあれば書き込み
  if (batchData.length > 0) {
    var dataRange = sheet.getRange(currentRow, 1, batchData.length, 9);
    dataRange.setValues(batchData);
    console.log('最終バッチ書き込み完了: ' + batchData.length + ' 件');
  }

  // 最終完了表示
  progressCell.setValue('完了: ' + successCount + '/' + totalMunicipalities);
  SpreadsheetApp.flush();
  
  console.log('全処理完了: ' + successCount + '/' + totalMunicipalities + ' 自治体');
  
  // 結果表示
  var ui = SpreadsheetApp.getUi();
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


