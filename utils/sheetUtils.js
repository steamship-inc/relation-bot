/**
 * シート初期化用共通ユーティリティ
 */

/**
 * 指定された名前のシートを初期化する
 * @param {string} sheetName シート名
 * @param {string} title シートタイトル
 * @param {Array} headers ヘッダー行の配列
 * @returns {Object} 初期化されたシートとプログレスセルを含むオブジェクト
 */
function initializeSheet(sheetName, title, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  // シートがなければ新規作成、既存シートあればデータクリア
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  
  // 対象シートをアクティブにする
  ss.setActiveSheet(sheet);

  // A1にシートタイトルを設定
  sheet.getRange(CONSTANTS.TITLE_CELL).setValue(title);
  sheet.getRange(CONSTANTS.TITLE_CELL).setFontWeight('bold');

  // ヘッダー行を設定
  if (headers && headers.length > 0) {
    sheet.getRange(CONSTANTS.HEADER_ROW, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(CONSTANTS.HEADER_ROW, 1, 1, headers.length).setFontWeight('bold');
  }
  
  return {
    sheet: sheet,
    progressCell: sheet.getRange(CONSTANTS.PROGRESS_CELL),
    currentRow: CONSTANTS.DATA_START_ROW
  };
}

/**
 * 進捗表示を更新する
 * @param {Range} progressCell 進捗表示セル
 * @param {number} current 現在の処理数
 * @param {number} total 総処理数
 * @param {string} message 追加メッセージ
 */
function updateProgress(progressCell, current, total, message) {
  var progressText = '進捗: ' + current + '/' + total;
  if (message) {
    progressText += ' - ' + message;
  }
  progressCell.setValue(progressText);
  progressCell.setFontWeight('bold');
  
  // 進捗更新時のみflushを実行
  if (message === 'API制限のため60秒待機' || current === total) {
    SpreadsheetApp.flush();
  }
}