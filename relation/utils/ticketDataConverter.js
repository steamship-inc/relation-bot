/**
 * チケットデータ変換ユーティリティ
 * fetchTickets.js から分離されたデータ変換ロジック
 */

/**
 * チケットオブジェクトを行データに変換
 * @param {Object} ticket チケットオブジェクト
 * @param {Object} config 自治体設定
 * @param {Object} caseCategoriesMap チケット分類マップ
 * @param {Object} labelsMap ラベルマップ
 * @return {Array} 行データ配列
 */
function convertTicketToRowData(ticket, config, caseCategoriesMap, labelsMap) {
  var caseCategoryIds = ticket.case_category_ids || [];
  var labelIds = ticket.label_ids || [];
  
  var categoryNames = getCategoryNames(caseCategoryIds, caseCategoriesMap);
  var labelNames = getLabelNames(labelIds, labelsMap);
  
  return [
    config.messageBoxId,                        // 受信箱ID
    config.name,                                // 自治体名
    ticket.ticket_id,                           // チケットID
    ticket.title,                               // タイトル
    ticket.status_cd,                           // ステータス
    ticket.assignee || '',                      // 担当者のメンション名
    parseDate(ticket.created_at),               // 作成日（Dateオブジェクト）
    parseDate(ticket.last_updated_at),          // 更新日（Dateオブジェクト）
    categoryNames.join(', '),                   // チケット分類名
    labelNames.join(', '),                      // ラベル名
    ticket.pending_reason_id || '',             // 保留理由ID
    ticket.color_cd || '',                      // 色
    false                                       // 詳細表示チェックボックス（デフォルト：false）
  ];
}

/**
 * チケットにリンクを設定
 * @param {Sheet} sheet 対象シート
 * @param {Array} ticketDataArray チケットデータ配列
 * @param {Object} configs 自治体設定
 */
function setupTicketLinks(sheet, ticketDataArray, configs) {
  if (!ticketDataArray || ticketDataArray.length === 0) return;
  
  console.log('チケットリンク設定開始: ' + ticketDataArray.length + '件');
  
  for (var i = 0; i < ticketDataArray.length; i++) {
    var rowData = ticketDataArray[i];
    var municipalityName = rowData[getColumnIndex('OPEN_TICKETS', 'MUNICIPALITY_NAME')];
    var ticketId = rowData[getColumnIndex('OPEN_TICKETS', 'TICKET_ID')];
    var title = rowData[getColumnIndex('OPEN_TICKETS', 'TITLE')];
    
    // 自治体設定から受信箱IDを取得
    var ticketConfig = findConfigByMunicipalityName(configs, municipalityName);
    
    if (ticketConfig) {
      var ticketUrl = buildTicketUrl(ticketConfig.messageBoxId, ticketId, 'open');
      var richTextTitle = SpreadsheetApp.newRichTextValue()
        .setText(title)
        .setLinkUrl(ticketUrl)
        .build();
      
      // タイトル列にリンクを設定（6行目から開始、1ベースなので+1）
      var rowNumber = 6 + i;
      var titleColumnIndex = getColumnIndex('OPEN_TICKETS', 'TITLE') + 1; // 1ベースに変換
      sheet.getRange(rowNumber, titleColumnIndex).setRichTextValue(richTextTitle);
    }
  }
  
  console.log('チケットリンク設定完了');
}

/**
 * 自治体名から設定を検索
 * @param {Object} configs 自治体設定オブジェクト
 * @param {string} municipalityName 自治体名
 * @return {Object} 該当する自治体設定
 */
function findConfigByMunicipalityName(configs, municipalityName) {
  for (var configKey in configs) {
    if (configs[configKey].name === municipalityName) {
      return configs[configKey];
    }
  }
  return null;
}
