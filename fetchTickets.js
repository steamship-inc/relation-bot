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
  
  // チケット詳細サイドバーボタンを作成
  createTicketDetailButton(sheet);
  
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
    }
    
    try {
      var tickets = fetchTicketsForMunicipality(config, 'openTickets');
      
      // チケット分類とラベルの名前を取得
      var caseCategoriesMap = getCaseCategoriesMap(config.messageBoxId);
      var labelsMap = getLabelsMap(config.messageBoxId);
      
      // チケットデータを配列に追加（一括処理用）
      tickets.forEach(function(ticket) {
        var caseCategoryIds = ticket.case_category_ids || [];
        var labelIds = ticket.label_ids || [];
        
        var categoryNames = getCategoryNames(caseCategoryIds, caseCategoriesMap);
        var labelNames = getLabelNames(labelIds, labelsMap);
        
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
            }
          }
          
          currentRow += batchData.length;
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
  // Slack通知フィルタ条件を適用
  var filteredTickets = applySlackNotificationFilter(tickets, config);
  
  // フィルタ条件に該当するチケットがある場合のみ通知
  if (filteredTickets.length > 0) {
    sendSlackWithRateLimit(filteredTickets, config, isLast);
  } else {
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


