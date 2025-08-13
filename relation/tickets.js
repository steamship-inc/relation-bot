/**
 * re:lation チケット取得機能
 * menu.js の fetchOpenTickets に対応
 */

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
  var headers = ['受信箱ID', '自治体名', 'ID', 'タイトル', 'ステータス', '担当者', '作成日', '更新日', 'チケット分類', 'ラベル', '保留理由ID', '色'];
  var sheetInfo = initializeSheet('🎫未対応チケット', '🎫 未対応チケット', headers);
  var sheet = sheetInfo.sheet;
  var progressCell = sheetInfo.progressCell;
  
  // チケット詳細サイドバーボタンを作成
  createTicketDetailButton(sheet);
  
  var totalTickets = 0;
  var allTicketsData = [];
  var currentRow = 6; // データ開始行（ヘッダーの下）
  
  // バッチ処理設定
  var batchOptions = {
    batchSize: 50,
    waitTime: 60000,
    progressCell: progressCell,
    onBatchComplete: function(batchData, index) {
      // 50自治体分のデータを書き込み
      currentRow = writeBatchData(sheet, batchData, currentRow, 12);
      
      // 日付列（G列：作成日、H列：更新日）のフォーマットを設定
      var dateFormatRange = sheet.getRange(currentRow - batchData.length, 7, batchData.length, 2);
      dateFormatRange.setNumberFormat('yyyy/mm/dd hh:mm');
      
      // チケットIDとタイトルにリンクを設定
      setTicketLinks(sheet, batchData, currentRow - batchData.length, configs);
    }
  };
  
  // 各自治体のチケットを処理
  var configIds = Object.keys(configs);
  var result = processBatch(configIds, function(municipalityId, index) {
    var config = configs[municipalityId];
    
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
    
    // チケットデータを配列に変換
    var ticketDataArray = tickets.map(function(ticket) {
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
      
      return [
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
    });
    
    totalTickets += tickets.length;
    allTicketsData = allTicketsData.concat(ticketDataArray);
    
    // Slack通知送信（設定されている場合）
    if (config.slackChannel) {
      var isLast = (index === configIds.length - 1);
      sendSlackToMunicipality(tickets, config, isLast);
    }
    
    return ticketDataArray;
    
  }, batchOptions);
  
  // 最終確認：残りのデータがあれば書き込み
  var finalBatchData = allTicketsData.slice(currentRow - 6);
  if (finalBatchData.length > 0) {
    writeBatchData(sheet, finalBatchData, currentRow, 12);
  }

  // 処理完了表示
  showCompletionResult(result.successCount, configIds.length, result.errorList, '全自治体チケット', progressCell);
  
  // 追加の結果情報
  var ui = SpreadsheetApp.getUi();
  var message = '全自治体チケット取得完了\n\n';
  message += '成功: ' + result.successCount + '件の自治体\n';
  message += '取得チケット総数: ' + totalTickets + '件\n';
  if (result.errorList.length > 0) {
    message += 'エラー: ' + result.errorList.length + '件\n\n';
    message += result.errorList.join('\n');
  }
  
  ui.alert('実行結果', message, ui.ButtonSet.OK);
}

/**
 * チケットIDとタイトルにリンクを設定
 * @param {Sheet} sheet 対象シート
 * @param {Array} batchData バッチデータ
 * @param {number} startRow 開始行
 * @param {Object} configs 自治体設定
 */
function setTicketLinks(sheet, batchData, startRow, configs) {
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
      // チケット詳細URLを生成
      var ticketUrl = buildTicketUrl(ticketConfig.messageBoxId, ticketId, 'open');
      
      // チケットIDセル（C列）にリンクを設定
      var ticketIdCell = sheet.getRange(startRow + j, 3);
      var richTextTicketId = SpreadsheetApp.newRichTextValue()
        .setText(ticketId.toString())
        .setLinkUrl(ticketUrl)
        .build();
      ticketIdCell.setRichTextValue(richTextTicketId);
      
      // タイトルセル（D列）にリンクを設定
      var titleCell = sheet.getRange(startRow + j, 4);
      var richTextTitle = SpreadsheetApp.newRichTextValue()
        .setText(title)
        .setLinkUrl(ticketUrl)
        .build();
      titleCell.setRichTextValue(richTextTitle);
    }
  }
}

/**
 * 指定自治体のチケットを取得する共通関数
 * @param {Object} config 自治体設定
 * @param {string} ticketType 'openTickets'
 * @return {Array} チケット配列
 */
function fetchTicketsForMunicipality(config, ticketType) {
  // チケット検索APIのエンドポイント
  var apiUrl = buildTicketSearchUrl(config.messageBoxId);

  // 共通検索条件を取得（全自治体統一）
  var searchConditions = getCommonSearchConditions();
  var payload = {
    status_cds: searchConditions.status_cds,
    per_page: searchConditions.per_page,
    page: searchConditions.page
  };

  // APIリクエスト（POST）
  var response = UrlFetchApp.fetch(apiUrl, {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + getRelationApiKey(),
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
 * チケット詳細をAPIから取得
 * @param {string} messageBoxId 受信箱ID
 * @param {string} ticketId チケットID
 * @return {Object} チケット詳細オブジェクト
 */
function fetchTicketDetail(messageBoxId, ticketId) {
  // チケット詳細APIのエンドポイント
  var apiUrl = buildTicketDetailUrl(messageBoxId, ticketId);
  
  console.log('チケット詳細API呼び出し: ' + apiUrl);
  
  // APIリクエスト（GET）
  var response = UrlFetchApp.fetch(apiUrl, {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + getRelationApiKey(),
      'Content-Type': 'application/json'
    }
  });
  
  // レスポンスをパース
  var ticketDetail = JSON.parse(response.getContentText());
  
  console.log('チケット詳細取得成功: ' + JSON.stringify(ticketDetail, null, 2));
  
  return ticketDetail;
}

/**
 * シート上にチケット詳細サイドバーボタンを作成
 * @param {Sheet} sheet 対象シート
 */
function createTicketDetailButton(sheet) {
  // 既存のボタンを削除（再作成時の重複を防ぐ）
  var drawings = sheet.getDrawings();
  for (var i = 0; i < drawings.length; i++) {
    var drawing = drawings[i];
    if (drawing.getOnAction() === 'showTicketDetailSidebarFromButton') {
      drawing.remove();
    }
  }
  
  try {
    // ボタン用の図形を作成（E1セルの位置に配置）
    var button = sheet.insertShape(SpreadsheetApp.ShapeType.RECTANGLE, 350, 5, 200, 35);
    
    // ボタンのスタイルを設定
    button.setFill('#34a853');  // Google Greenの背景色
    button.setBorder('#137333', 2);  // 境界線
    
    // ボタンのテキストを設定
    button.setText('📋 サイドバーで詳細表示');
    button.setTextStyle(SpreadsheetApp.newTextStyle()
      .setForegroundColor('#ffffff')
      .setFontSize(12)
      .setBold(true)
      .build());
    
    // クリック時に実行する関数を設定
    button.setOnAction('showTicketDetailSidebarFromButton');
    
    console.log('チケット詳細サイドバーボタンを作成しました');
    
  } catch (error) {
    console.error('ボタン作成エラー: ' + error.toString());
    // ボタン作成に失敗した場合はログに記録するだけで処理を継続
  }
}

/**
 * ボタンクリック時に呼び出される関数
 * チケット詳細サイドバーを表示
 */
function showTicketDetailSidebarFromButton() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  
  // 🎫未対応チケットシートかチェック
  if (sheet.getName() !== '🎫未対応チケット') {
    SpreadsheetApp.getUi().alert('エラー', '🎫未対応チケットシートで実行してください。', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  try {
    // サイドバーを表示
    showTicketDetailSidebar();
    
    // 使い方のヒントを表示
    SpreadsheetApp.getUi().alert('サイドバー表示', 'チケット詳細サイドバーを表示しました。\n\n💡 使い方:\n1. チケット一覧から見たい行をクリック\n2. サイドバーに詳細が自動表示されます\n3. 別の行を選択すると詳細が切り替わります', SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    console.error('サイドバー表示エラー: ' + error.toString());
    SpreadsheetApp.getUi().alert('エラー', 'サイドバーの表示に失敗しました。\n\n' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}