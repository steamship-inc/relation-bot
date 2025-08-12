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
  sheet.getRange(5, 1, 1, 12).setValues([['受信箱ID', '自治体名', 'ID', 'タイトル', 'ステータス', '担当者', '作成日', '更新日', 'チケット分類', 'ラベル', '保留理由ID', '色']]);
  sheet.getRange(5, 1, 1, 12).setFontWeight('bold');
  
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
      
      // チケット分類とラベルの名前を取得
      var caseCategoriesMap = getCaseCategoriesMap(config.messageBoxId);
      var labelsMap = getLabelsMap(config.messageBoxId);
      
      console.log('自治体: ' + config.name + ', チケット分類数: ' + Object.keys(caseCategoriesMap).length + ', ラベル数: ' + Object.keys(labelsMap).length);
      
      // デバッグ用：最初のチケットの全プロパティを出力（APIレスポンス確認用）
      if (tickets.length > 0) {
        console.log('=== API レスポンス サンプル（' + config.name + '）===');
        console.log('チケット数: ' + tickets.length);
        console.log('最初のチケットの全プロパティ: ' + JSON.stringify(tickets[0], null, 2));
        console.log('=====================================');
      }
      
      // チケットデータを配列に追加（一括処理用）
      tickets.forEach(function(ticket) {
        var caseCategoryIds = ticket.case_category_ids || [];
        var labelIds = ticket.label_ids || [];
        
        // デバッグ用ログ：ラベルIDをログ出力
        if (labelIds.length > 0) {
          console.log('チケットID: ' + ticket.ticket_id + ', ラベルID: ' + JSON.stringify(labelIds));
        }
        
        var categoryNames = getCategoryNames(caseCategoryIds, caseCategoriesMap);
        var labelNames = getLabelNames(labelIds, labelsMap);
        
        // デバッグ用ログ：ラベル名の変換結果をログ出力
        if (labelIds.length > 0) {
          console.log('ラベルID -> ラベル名変換: ' + JSON.stringify(labelIds) + ' -> ' + JSON.stringify(labelNames));
        }
        
        var ticketData = [
          config.messageBoxId,        // 受信箱ID
          config.name,                // 自治体名
          ticket.ticket_id,           // チケットID
          ticket.title,               // タイトル
          ticket.status_cd,           // ステータス
          ticket.assignee || '',      // 担当者のメンション名
          parseDate(ticket.created_at),          // 作成日（Dateオブジェクト）
          parseDate(ticket.last_updated_at),     // 更新日（Dateオブジェクト）
          categoryNames.join(', '),   // チケット分類名
          labelNames.join(', '),      // ラベル名
          ticket.pending_reason_id || '',        // 保留理由ID
          ticket.color_cd || ''       // 色
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
          var dataRange = sheet.getRange(currentRow, 1, batchData.length, 12);
          dataRange.setValues(batchData);
          
          // 日付列（G列：作成日、H列：更新日）のフォーマットを設定
          var dateFormatRange = sheet.getRange(currentRow, 7, batchData.length, 2); // G列とH列
          dateFormatRange.setNumberFormat('yyyy/mm/dd hh:mm');
          
          // チケットIDとタイトルにリンクを設定
          for (var j = 0; j < batchData.length; j++) {
            var ticketRowData = batchData[j];
            var ticketId = ticketRowData[2]; // チケットID
            var title = ticketRowData[3]; // タイトル
            var municipalityName = ticketRowData[1]; // 自治体名
            
            // 自治体設定から受信箱IDを取得
            var ticketConfig = null;
            for (var configKey in configs) {
              if (configs[configKey].name === municipalityName) {
                ticketConfig = configs[configKey];
                break;
              }
            }
            
            if (ticketConfig) {
              // D列（タイトル）にre:lationへのリンクを設定
              var ticketUrl = buildTicketUrl(ticketConfig.messageBoxId, ticketId, 'open');
              var richTextTitle = SpreadsheetApp.newRichTextValue()
                .setText(title)
                .setLinkUrl(ticketUrl)
                .build();
              
              sheet.getRange(currentRow + j, 4).setRichTextValue(richTextTitle);
              
              // C列（チケットID）にメモを追加して詳細表示のヒントを提供
              var ticketIdCell = sheet.getRange(currentRow + j, 3);
              ticketIdCell.setNote('詳細を表示するには、この行を選択してメニューから「チケット詳細表示」を実行してください。\n受信箱ID: ' + ticketConfig.messageBoxId + '\nチケットID: ' + ticketId);
            }
          }
          
          currentRow += batchData.length;
          console.log('50自治体バッチ書き込み完了: ' + batchData.length + ' 件 (累計: ' + allTicketsData.length + ' 件)');
          batchData = []; // バッチデータをリセット
        }
      }
      
      // Slack通知（Slackチャンネル設定がある場合のみ）
      // if (config.slackChannel) {
      //   sendSlackToMunicipality(tickets, config, false);
      // }
      
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
    var dataRange = sheet.getRange(currentRow, 1, batchData.length, 12);
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

/**
 * ISO 8601形式の日時を読みやすい形式に変換
 * @param {string} isoString ISO 8601形式の日時文字列
 * @return {string} 読みやすい形式の日時 (yyyy/MM/dd HH:mm)
 */
function formatDate(isoString) {
  if (!isoString) return '';
  var date = new Date(isoString);
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
}

/**
 * ISO 8601形式の日時をDateオブジェクトに変換
 * @param {string} isoString ISO 8601形式の日時文字列
 * @return {Date|string} Dateオブジェクトまたは空文字列
 */
function parseDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString);
}

/**
 * 指定受信箱IDのチケット分類マップを取得
 * @param {string} messageBoxId 受信箱ID
 * @return {Object} チケット分類マップ（ID → 名前）
 */
function getCaseCategoriesMap(messageBoxId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('🏷️チケット分類');
    
    if (!sheet) {
      console.log('🏷️チケット分類シートが見つかりません');
      return {};
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 5) {
      console.log('🏷️チケット分類シートにデータがありません');
      return {};
    }
    
    var categoriesMap = {};
    
    // データ行をループ（6行目以降、0ベースで5以降）
    for (var i = 5; i < data.length; i++) {
      var row = data[i];
      
      // 受信箱IDが一致するかチェック（A列: 受信箱ID）
      if (row[0] && row[0].toString() === messageBoxId.toString()) {
        var categoryId = row[2]; // C列: チケット分類ID
        var categoryName = row[3]; // D列: チケット分類名
        
        if (categoryId && categoryName) {
          // 数値IDと文字列IDの両方に対応
          var numericId = parseInt(categoryId);
          if (!isNaN(numericId)) {
            categoriesMap[numericId] = categoryName;
          }
          categoriesMap[categoryId] = categoryName;
          categoriesMap[categoryId.toString()] = categoryName;
        }
      }
    }
    
    console.log('チケット分類マップ取得完了: ' + Object.keys(categoriesMap).length + '件');
    return categoriesMap;
    
  } catch (error) {
    console.error('チケット分類マップ取得エラー: ' + error.toString());
    return {};
  }
}

/**
 * 指定受信箱IDのラベルマップを取得
 * @param {string} messageBoxId 受信箱ID
 * @return {Object} ラベルマップ（ID → 名前）
 */
function getLabelsMap(messageBoxId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('🏷️ラベル');
    
    if (!sheet) {
      console.log('🏷️ラベルシートが見つかりません');
      return {};
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 5) {
      console.log('🏷️ラベルシートにデータがありません');
      return {};
    }
    
    var labelsMap = {};
    
    // データ行をループ（6行目以降、0ベースで5以降）
    for (var i = 5; i < data.length; i++) {
      var row = data[i];
      
      // 受信箱IDが一致するかチェック（A列: 受信箱ID）
      if (row[0] && row[0].toString() === messageBoxId.toString()) {
        var labelId = row[2]; // C列: ラベルID
        var labelName = row[3]; // D列: ラベル名
        
        if (labelId && labelName) {
          // 数値IDと文字列IDの両方に対応
          var numericId = parseInt(labelId);
          if (!isNaN(numericId)) {
            labelsMap[numericId] = labelName;
          }
          labelsMap[labelId] = labelName;
          labelsMap[labelId.toString()] = labelName;
        }
      }
    }
    
    console.log('ラベルマップ取得完了: ' + Object.keys(labelsMap).length + '件');
    if (Object.keys(labelsMap).length > 0) {
      console.log('ラベルマップサンプル: ' + JSON.stringify(Object.keys(labelsMap).slice(0, 5).reduce(function(obj, key) {
        obj[key] = labelsMap[key];
        return obj;
      }, {})));
    }
    return labelsMap;
    
  } catch (error) {
    console.error('ラベルマップ取得エラー: ' + error.toString());
    return {};
  }
}

/**
 * チケット分類IDから分類名の配列を取得
 * @param {Array} categoryIds チケット分類ID配列
 * @param {Object} categoriesMap チケット分類マップ
 * @return {Array} チケット分類名配列
 */
function getCategoryNames(categoryIds, categoriesMap) {
  if (!categoryIds || categoryIds.length === 0) {
    return [];
  }
  
  return categoryIds.map(function(categoryId) {
    // 文字列と数値の両方でカテゴリマップを検索
    var categoryName = categoriesMap[categoryId] || categoriesMap[parseInt(categoryId)] || categoriesMap[categoryId.toString()];
    return categoryName || 'ID:' + categoryId; // 名前が見つからない場合はIDを表示
  });
}

/**
 * ラベルIDからラベル名の配列を取得
 * @param {Array} labelIds ラベルID配列
 * @param {Object} labelsMap ラベルマップ
 * @return {Array} ラベル名配列
 */
function getLabelNames(labelIds, labelsMap) {
  if (!labelIds || labelIds.length === 0) {
    return [];
  }
  
  return labelIds.map(function(labelId) {
    // 文字列と数値の両方でラベルマップを検索
    var labelName = labelsMap[labelId] || labelsMap[parseInt(labelId)] || labelsMap[labelId.toString()];
    
    // デバッグ用ログ：ID変換の詳細
    if (!labelName) {
      console.log('ラベル名が見つかりません - ID: ' + labelId + ' (type: ' + typeof labelId + ')');
      console.log('利用可能なラベルID: ' + Object.keys(labelsMap).slice(0, 10).join(', '));
    }
    
    return labelName || 'ID:' + labelId; // 名前が見つからない場合はIDを表示
  });
}

/**
 * チケット詳細を取得してモーダルで表示
 * @param {string} messageBoxId 受信箱ID
 * @param {string} ticketId チケットID
 */
function showTicketDetail(messageBoxId, ticketId) {
  try {
    // チケット詳細をAPIから取得
    var ticketDetail = fetchTicketDetail(messageBoxId, ticketId);
    
    // モーダル用のHTMLを生成
    var html = createTicketDetailHtml(ticketDetail, messageBoxId);
    
    // モーダルダイアログを表示
    var htmlOutput = HtmlService.createHtmlOutput(html)
      .setWidth(800)
      .setHeight(600);
    
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'チケット詳細 - ID: ' + ticketId);
    
  } catch (error) {
    console.error('チケット詳細取得エラー: ' + error.toString());
    SpreadsheetApp.getUi().alert('エラー', 'チケット詳細の取得に失敗しました。\n\n' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 選択した行のチケット詳細を表示（メニューから呼び出し）
 */
function showSelectedTicketDetail() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var selection = sheet.getActiveRange();
  
  // 🎫未対応チケットシートかチェック
  if (sheet.getName() !== '🎫未対応チケット') {
    SpreadsheetApp.getUi().alert('エラー', '🎫未対応チケットシートで実行してください。', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  // 選択した行を取得
  var row = selection.getRow();
  
  // ヘッダー行より下かチェック
  if (row < 6) {
    SpreadsheetApp.getUi().alert('エラー', 'チケットデータの行を選択してください。', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  try {
    // A列：受信箱ID、C列：チケットIDを取得
    var messageBoxId = sheet.getRange(row, 1).getValue();
    var ticketId = sheet.getRange(row, 3).getValue();
    
    if (!messageBoxId || !ticketId) {
      SpreadsheetApp.getUi().alert('エラー', '受信箱IDまたはチケットIDが見つかりません。', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // チケット詳細を表示
    showTicketDetail(messageBoxId.toString(), ticketId.toString());
    
  } catch (error) {
    console.error('選択行からのチケット詳細表示エラー: ' + error.toString());
    SpreadsheetApp.getUi().alert('エラー', 'チケット詳細の表示に失敗しました。\n\n' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * チケット詳細をAPIから取得
 * @param {string} messageBoxId 受信箱ID
 * @param {string} ticketId チケットID
 * @return {Object} チケット詳細オブジェクト
 */
function fetchTicketDetail(messageBoxId, ticketId) {
  // APIキーを取得
  var apiKey = getRelationApiKey();
  
  // チケット詳細APIのエンドポイント
  var apiUrl = buildTicketDetailUrl(messageBoxId, ticketId);
  
  console.log('チケット詳細API呼び出し: ' + apiUrl);
  
  // APIリクエスト（GET）
  var response = UrlFetchApp.fetch(apiUrl, {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    }
  });
  
  // レスポンスをパース
  var ticketDetail = JSON.parse(response.getContentText());
  
  console.log('チケット詳細取得成功: ' + JSON.stringify(ticketDetail, null, 2));
  
  return ticketDetail;
}

/**
 * チケット詳細のHTMLを生成
 * @param {Object} ticket チケット詳細オブジェクト
 * @param {string} messageBoxId 受信箱ID
 * @return {string} HTML文字列
 */
function createTicketDetailHtml(ticket, messageBoxId) {
  // チケット分類とラベルの名前を取得
  var caseCategoriesMap = getCaseCategoriesMap(messageBoxId);
  var labelsMap = getLabelsMap(messageBoxId);
  
  var categoryNames = getCategoryNames(ticket.case_category_ids || [], caseCategoriesMap);
  var labelNames = getLabelNames(ticket.label_ids || [], labelsMap);
  
  // メッセージ数を取得
  var messageCount = ticket.messages ? ticket.messages.length : 0;
  
  // HTMLエスケープ関数
  function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  // メッセージ一覧のHTML生成
  var messagesHtml = '';
  if (ticket.messages && ticket.messages.length > 0) {
    for (var i = 0; i < ticket.messages.length; i++) {
      var msg = ticket.messages[i];
      var index = i + 1;
      
      var messageBody = msg.body || '';
      if (messageBody.length > 200) {
        messageBody = messageBody.substring(0, 200) + '...';
      }
      
      messagesHtml += '<div class="message-item">';
      messagesHtml += '<div class="message-header">';
      messagesHtml += index + '. ' + escapeHtml(msg.title || '件名なし');
      messagesHtml += ' <span style="color: #999; font-size: 0.9em;">';
      messagesHtml += '(' + formatDate(msg.created_at) + ' | ' + escapeHtml(msg.method_cd || '') + ' | ' + escapeHtml(msg.action_cd || '') + ')';
      messagesHtml += '</span>';
      messagesHtml += '</div>';
      
      messagesHtml += '<div><strong>From:</strong> ' + escapeHtml(msg.from || '') + '</div>';
      messagesHtml += '<div><strong>To:</strong> ' + escapeHtml(msg.to || '') + '</div>';
      
      if (msg.cc) {
        messagesHtml += '<div><strong>Cc:</strong> ' + escapeHtml(msg.cc) + '</div>';
      }
      
      messagesHtml += '<div class="message-body">' + escapeHtml(messageBody) + '</div>';
      
      if (msg.comments && msg.comments.length > 0) {
        messagesHtml += '<div style="margin-top: 10px;"><strong>コメント:</strong> ' + msg.comments.length + '件</div>';
      }
      
      if (msg.attachments && msg.attachments.length > 0) {
        messagesHtml += '<div><strong>添付ファイル:</strong> ' + msg.attachments.length + '件</div>';
      }
      
      messagesHtml += '</div>';
    }
  } else {
    messagesHtml = '<div>メッセージがありません</div>';
  }
  
  var html = '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<style>' +
    'body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }' +
    '.header { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }' +
    '.section { margin-bottom: 20px; }' +
    '.section h3 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 5px; }' +
    '.field { margin-bottom: 10px; }' +
    '.field strong { display: inline-block; width: 120px; color: #555; }' +
    '.message-list { max-height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; background-color: #fafafa; }' +
    '.message-item { background-color: #fff; margin-bottom: 10px; padding: 10px; border-radius: 3px; border-left: 3px solid #007cba; }' +
    '.message-header { font-weight: bold; color: #333; margin-bottom: 5px; }' +
    '.message-body { color: #666; max-height: 120px; overflow-y: auto; margin-top: 8px; padding: 8px; background-color: #f9f9f9; border-radius: 3px; }' +
    '.close-btn { text-align: center; margin-top: 20px; }' +
    '.close-btn button { background-color: #007cba; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }' +
    '.close-btn button:hover { background-color: #005a8b; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="header">' +
    '<h2>🎫 ' + escapeHtml(ticket.title || 'タイトルなし') + '</h2>' +
    '<div class="field"><strong>チケットID:</strong> ' + escapeHtml(ticket.ticket_id || '') + '</div>' +
    '<div class="field"><strong>ステータス:</strong> ' + escapeHtml(ticket.status_cd || '') + '</div>' +
    '<div class="field"><strong>担当者:</strong> ' + escapeHtml(ticket.assignee || '未割り当て') + '</div>' +
    '</div>' +
    
    '<div class="section">' +
    '<h3>📋 基本情報</h3>' +
    '<div class="field"><strong>作成日:</strong> ' + escapeHtml(formatDate(ticket.created_at) || '') + '</div>' +
    '<div class="field"><strong>更新日:</strong> ' + escapeHtml(formatDate(ticket.last_updated_at) || '') + '</div>' +
    '<div class="field"><strong>色:</strong> ' + escapeHtml(ticket.color_cd || 'なし') + '</div>' +
    '<div class="field"><strong>保留理由ID:</strong> ' + escapeHtml(ticket.pending_reason_id || 'なし') + '</div>' +
    '</div>' +
    
    '<div class="section">' +
    '<h3>🏷️ 分類・ラベル</h3>' +
    '<div class="field"><strong>チケット分類:</strong> ' + escapeHtml(categoryNames.join(', ') || 'なし') + '</div>' +
    '<div class="field"><strong>ラベル:</strong> ' + escapeHtml(labelNames.join(', ') || 'なし') + '</div>' +
    '</div>' +
    
    '<div class="section">' +
    '<h3>💬 メッセージ (' + messageCount + '件)</h3>' +
    '<div class="message-list">' +
    messagesHtml +
    '</div>' +
    '</div>' +
    
    '<div class="close-btn">' +
    '<button onclick="google.script.host.close()">閉じる</button>' +
    '</div>' +
    
    '</body>' +
    '</html>';
  
  return html;
}


