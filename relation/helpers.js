/**
 * 🏛 設定・ユーティリティ機能
 * - 自治体管理
 * - 設定管理
 * - 共通ユーティリティ
 * - エラーハンドリング
 * - バッチ処理
 */

// ========= システム定数 =========
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
  
  // 進捗表示
  PROGRESS: {
    CELL_POSITION: 'B2'
  },
  
  // API設定
  API: {
    BASE_URL: 'https://api.relation.app',
    TIMEOUT: 30000
  }
};

/**
 * 定数を取得
 * @param {string} path ドット記法のパス
 * @return {*} 定数値
 */
function getConstant(path) {
  var keys = path.split('.');
  var current = CONSTANTS;
  
  for (var i = 0; i < keys.length; i++) {
    if (current[keys[i]] === undefined) {
      throw new Error('定数が見つかりません: ' + path);
    }
    current = current[keys[i]];
  }
  
  return current;
}

/**
 * シート名を取得
 * @param {string} type シートタイプ
 * @return {string} シート名
 */
function getSheetName(type) {
  return getConstant('SHEET_NAMES.' + type);
}

// ========= エラーハンドリング =========
/**
 * 統一されたエラーハンドリング
 * @param {Error} error エラーオブジェクト
 * @param {string} context エラーが発生した関数名
 * @param {string} userMessage ユーザー向けメッセージ
 */
function handleError(error, context, userMessage) {
  // コンソールログ
  console.error('【' + context + '】エラー:', error.toString());
  if (error.stack) {
    console.error('スタックトレース:', error.stack);
  }
  
  // ユーザー通知
  if (userMessage) {
    var ui = SpreadsheetApp.getUi();
    ui.alert('エラー', userMessage, ui.ButtonSet.OK);
  }
  
  // Slack通知（重要なエラーの場合）
  if (isSignificantError(error)) {
    sendSlackErrorNotification(
      context + 'でエラーが発生しました',
      userMessage || error.toString(),
      {
        error: error.toString(),
        context: context,
        timestamp: new Date().toISOString()
      }
    );
  }
}

/**
 * 重要なエラーかどうかを判定
 * @param {Error} error エラーオブジェクト
 * @return {boolean} 重要エラーフラグ
 */
function isSignificantError(error) {
  var significantPatterns = [
    'API',
    'Authentication',
    'Network',
    'Timeout',
    'Rate',
    'Unauthorized'
  ];
  
  var errorString = error.toString().toLowerCase();
  
  return significantPatterns.some(function(pattern) {
    return errorString.indexOf(pattern.toLowerCase()) !== -1;
  });
}

// ========= バッチ処理 =========
/**
 * バッチプロセッサを作成
 * @param {Object} options 設定オプション
 * @return {Object} プロセッサーオブジェクト
 */
function createBatchProcessor(options) {
  options = options || {};
  
  var batchSize = options.batchSize || getConstant('BATCH_SIZE');
  var waitTime = options.waitTime || getConstant('RATE_LIMIT_WAIT');
  var progressCell = options.progressCell;
  var progressPrefix = options.progressPrefix || '処理中';
  
  var processedCount = 0;
  
  return {
    process: function(taskFunction) {
      var result = taskFunction();
      processedCount++;
      
      // 進捗表示更新
      if (progressCell && processedCount % 10 === 0) {
        progressCell.setValue(progressPrefix + ': ' + processedCount + '件完了');
        SpreadsheetApp.flush();
      }
      
      // バッチサイズ到達時の待機
      if (processedCount % batchSize === 0) {
        console.log(batchSize + '件処理完了。' + (waitTime/1000) + '秒待機...');
        Utilities.sleep(waitTime);
      }
      
      return result;
    },
    
    getProcessedCount: function() {
      return processedCount;
    }
  };
}

// ========= シート管理 =========
/**
 * シートを初期化
 * @param {string} sheetName シート名
 * @param {Array} headers ヘッダー配列
 * @param {string} title タイトル
 * @return {Sheet} 初期化されたシート
 */
function initializeSheet(sheetName, headers, title) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  
  // タイトル設定
  if (title) {
    sheet.getRange(1, 1).setValue(title);
    sheet.getRange(1, 1, 1, headers.length).merge();
  }
  
  // ヘッダー設定
  if (headers && headers.length > 0) {
    sheet.getRange(5, 1, 1, headers.length).setValues([headers]);
  }
  
  return sheet;
}

// ========= 自治体管理 =========
/**
 * 自治体設定をシートから読み込み
 * @param {boolean} onlyValid 有効な設定のみか
 * @return {Object} 自治体設定オブジェクト
 */
function loadMunicipalityConfigFromSheet(onlyValid) {
  try {
    var sheetName = getSheetName('MESSAGE_BOXES');
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error('受信箱設定シートが見つかりません: ' + sheetName);
    }
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    
    var configs = {};
    
    // 6行目からデータ開始（1行目:タイトル、5行目:ヘッダー）
    for (var i = 5; i < values.length; i++) {
      var row = values[i];
      
      // 必須フィールドチェック
      if (!row[0] || !row[1] || !row[3]) continue;
      
      var municipalityId = row[0].toString();
      var config = {
        id: municipalityId,
        name: row[1],
        region: row[2] || '',
        messageBoxId: row[3],
        slackChannel: row[4] || '',
        slackTemplate: parseJsonSafely(row[5]),
        slackFilter: parseJsonSafely(row[6])
      };
      
      // 有効性チェック
      if (onlyValid && (!config.messageBoxId || config.messageBoxId.toString().trim() === '')) {
        continue;
      }
      
      configs[municipalityId] = config;
    }
    
    return configs;
    
  } catch (error) {
    console.error('自治体設定読み込みエラー:', error.toString());
    throw error;
  }
}

// ========= ユーティリティ関数 =========
/**
 * JSONを安全にパース
 * @param {string} jsonString JSON文字列
 * @return {Object|null} パース結果
 */
function parseJsonSafely(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON解析失敗:', jsonString);
    return null;
  }
}

/**
 * 期間をフォーマット
 * @param {number} milliseconds ミリ秒
 * @return {string} フォーマット済み期間
 */
function formatDuration(milliseconds) {
  var seconds = Math.floor(milliseconds / 1000);
  var minutes = Math.floor(seconds / 60);
  var hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return hours + '時間' + (minutes % 60) + '分' + (seconds % 60) + '秒';
  } else if (minutes > 0) {
    return minutes + '分' + (seconds % 60) + '秒';
  } else {
    return seconds + '秒';
  }
}
