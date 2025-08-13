/**
 * システム定数管理
 * 全ファイルで共通利用される定数を一元管理
 */

var CONSTANTS = {
  // バッチ処理設定
  BATCH_SIZE: 50,
  RATE_LIMIT_WAIT: 60000, // 60秒
  
  // シート名
  SHEET_NAMES: {
    MESSAGE_BOXES: '📮受信箱',
    OPEN_TICKETS: '🎫未対応チケット',
    CASE_CATEGORIES: '🏷️チケット分類',
    LABELS: '🏷️ラベル',
    CODE_TABLE: 'コード表'
  },
  
  // 列インデックス定義
  COLUMNS: {
    MESSAGE_BOXES: {
      MUNICIPALITY_ID: 0,     // A列: 自治体ID/団体コード
      MUNICIPALITY_NAME: 1,   // B列: 自治体名
      PREFECTURE: 2,          // C列: 都道府県
      MESSAGE_BOX_ID: 3,      // D列: 受信箱ID
      SLACK_CHANNEL: 4,       // E列: Slackチャンネル
      SLACK_TEMPLATE: 5,      // F列: Slack通知テンプレート(JSON)
      SLACK_FILTER: 6         // G列: Slack通知フィルタ(JSON)
    },
    
    OPEN_TICKETS: {
      MESSAGE_BOX_ID: 0,      // A列: 受信箱ID
      MUNICIPALITY_NAME: 1,   // B列: 自治体名
      TICKET_ID: 2,          // C列: チケットID
      TITLE: 3,              // D列: タイトル
      STATUS: 4,             // E列: ステータス
      ASSIGNEE: 5,           // F列: 担当者
      CREATED_AT: 6,         // G列: 作成日
      UPDATED_AT: 7,         // H列: 更新日
      CATEGORIES: 8,         // I列: チケット分類
      LABELS: 9,             // J列: ラベル
      PENDING_REASON: 10,    // K列: 保留理由ID
      COLOR: 11,             // L列: 色
      DETAIL_CHECKBOX: 12    // M列: 詳細表示チェックボックス
    },
    
    CASE_CATEGORIES: {
      MESSAGE_BOX_ID: 0,     // A列: 受信箱ID
      MUNICIPALITY_NAME: 1,  // B列: 自治体名
      CATEGORY_ID: 2,        // C列: チケット分類ID
      CATEGORY_NAME: 3,      // D列: チケット分類名
      PARENT_ID: 4,          // E列: 親分類ID
      SORT_ORDER: 5          // F列: 並び順
    },
    
    LABELS: {
      MESSAGE_BOX_ID: 0,     // A列: 受信箱ID
      MUNICIPALITY_NAME: 1,  // B列: 自治体名
      LABEL_ID: 2,           // C列: ラベルID
      LABEL_NAME: 3,         // D列: ラベル名
      COLOR: 4,              // E列: 色
      SORT_ORDER: 5          // F列: 並び順
    },
    
    CODE_TABLE: {
      MUNICIPALITY_CODE: 0,  // A列: 団体コード
      PREFECTURE: 1,         // B列: 都道府県名
      MUNICIPALITY_NAME: 2   // C列: 市区町村名
    }
  },
  
  // ヘッダー定義
  HEADERS: {
    MESSAGE_BOXES: [
      '自治体ID',
      '自治体名', 
      '都道府県',
      '受信箱ID',
      'Slackチャンネル',
      'Slack通知テンプレート(JSON)',
      'Slack通知フィルタ(JSON)'
    ],
    
    OPEN_TICKETS: [
      '受信箱ID', 
      '自治体名', 
      'ID', 
      'タイトル', 
      'ステータス', 
      '担当者', 
      '作成日', 
      '更新日', 
      'チケット分類', 
      'ラベル', 
      '保留理由ID', 
      '色', 
      '詳細表示'
    ],
    
    CASE_CATEGORIES: [
      '受信箱ID',
      '自治体名',
      'チケット分類ID',
      'チケット分類名',
      '親分類ID',
      '並び順'
    ],
    
    LABELS: [
      '受信箱ID',
      '自治体名',
      'ラベルID',
      'ラベル名',
      '色',
      '並び順'
    ]
  },
  
  // API設定
  API: {
    RATE_LIMIT_PER_MINUTE: 60,
    MAX_RETRIES: 3,
    TIMEOUT: 30000 // 30秒
  },
  
  // Slack設定
  SLACK: {
    MAX_MESSAGE_LENGTH: 3000,
    MAX_DISPLAY_TICKETS: 5,
    RATE_LIMIT_WAIT: 1500 // 1.5秒
  },
  
  // 日付フォーマット
  DATE_FORMAT: 'yyyy/mm/dd hh:mm',
  
  // 進捗表示設定
  PROGRESS: {
    CELL_POSITION: 'C1',
    UPDATE_INTERVAL: 50 // 50件ごとに更新
  }
};

/**
 * 定数を取得するヘルパー関数
 * @param {string} path ドット記法による定数パス（例: 'SHEET_NAMES.OPEN_TICKETS'）
 * @return {*} 定数値
 */
function getConstant(path) {
  var parts = path.split('.');
  var value = CONSTANTS;
  
  for (var i = 0; i < parts.length; i++) {
    if (value && typeof value === 'object' && parts[i] in value) {
      value = value[parts[i]];
    } else {
      throw new Error('定数が見つかりません: ' + path);
    }
  }
  
  return value;
}

/**
 * シート名を取得
 * @param {string} sheetKey シートキー
 * @return {string} シート名
 */
function getSheetName(sheetKey) {
  return getConstant('SHEET_NAMES.' + sheetKey);
}

/**
 * ヘッダー配列を取得
 * @param {string} headerKey ヘッダーキー
 * @return {Array} ヘッダー配列
 */
function getHeaders(headerKey) {
  return getConstant('HEADERS.' + headerKey);
}

/**
 * 列インデックスを取得
 * @param {string} tableKey テーブルキー
 * @param {string} columnKey 列キー
 * @return {number} 列インデックス
 */
function getColumnIndex(tableKey, columnKey) {
  return getConstant('COLUMNS.' + tableKey + '.' + columnKey);
}
