/**
 * チケットデータ取得サービス
 */

/**
 * チケット分類マップを取得
 * @param {number} messageBoxId メッセージボックスID (オプション)
 * @returns {Object} チケット分類マップ
 */
function getCaseCategoriesMap(messageBoxId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONSTANTS.SHEET_NAMES.CASE_CATEGORIES);
  
  if (!sheet) {
    return {};
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= CONSTANTS.HEADER_ROW) {
    return {};
  }
  
  var categoriesMap = {};
  
  // ヘッダー行をスキップしてデータ行から開始
  for (var i = CONSTANTS.HEADER_ROW; i < data.length; i++) {
    var row = data[i];
    var rowMessageBoxId = row[0];  // 受信箱ID
    var categoryId = row[2];       // チケット分類ID
    var categoryName = row[3];     // チケット分類名
    
    // 特定のメッセージボックスIDが指定されている場合はフィルタ
    if (messageBoxId && rowMessageBoxId != messageBoxId) {
      continue;
    }
    
    if (categoryId && categoryName) {
      categoriesMap[categoryId] = {
        id: categoryId,
        name: categoryName,
        messageBoxId: rowMessageBoxId
      };
    }
  }
  
  return categoriesMap;
}

/**
 * ラベルマップを取得
 * @param {number} messageBoxId メッセージボックスID (オプション)
 * @returns {Object} ラベルマップ
 */
function getLabelsMap(messageBoxId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONSTANTS.SHEET_NAMES.LABELS);
  
  if (!sheet) {
    return {};
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= CONSTANTS.HEADER_ROW) {
    return {};
  }
  
  var labelsMap = {};
  
  // ヘッダー行をスキップしてデータ行から開始
  for (var i = CONSTANTS.HEADER_ROW; i < data.length; i++) {
    var row = data[i];
    var rowMessageBoxId = row[0];  // 受信箱ID
    var labelId = row[2];          // ラベルID
    var labelName = row[3];        // ラベル名
    var color = row[4];            // 色
    
    // 特定のメッセージボックスIDが指定されている場合はフィルタ
    if (messageBoxId && rowMessageBoxId != messageBoxId) {
      continue;
    }
    
    if (labelId && labelName) {
      labelsMap[labelId] = {
        id: labelId,
        name: labelName,
        color: color || '',
        messageBoxId: rowMessageBoxId
      };
    }
  }
  
  return labelsMap;
}