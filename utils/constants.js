/**
 * 共通定数定義
 */
var CONSTANTS = {
  // バッチ処理関連
  BATCH_SIZE: 50,
  RATE_LIMIT_WAIT: 60000, // 60秒
  API_WAIT_TIME: 1500,    // 1.5秒
  
  // シート名定義
  SHEET_NAMES: {
    MESSAGE_BOXES: '📮受信箱',
    OPEN_TICKETS: '🎫未対応チケット',
    CASE_CATEGORIES: '🏷️チケット分類',
    LABELS: '🏷️ラベル'
  },
  
  // 進捗表示位置
  PROGRESS_CELL: 'C1',
  TITLE_CELL: 'A1',
  
  // データ開始行
  HEADER_ROW: 5,
  DATA_START_ROW: 6
};