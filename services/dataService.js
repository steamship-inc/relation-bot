/**
 * データサービス層
 * API呼び出しとデータアクセスロジックを統一管理
 */

/**
 * re:lation APIサービス
 */
var RelationApiService = {
  
  /**
   * チケット取得
   * @param {Object} config 自治体設定
   * @param {string} ticketType チケットタイプ
   * @return {Array} チケット配列
   */
  fetchTickets: function(config, ticketType) {
    validateData(config, 'config', { required: true, type: 'object' });
    validateData(config.messageBoxId, 'messageBoxId', { required: true });
    
    var apiCall = function() {
      var apiUrl = buildTicketSearchUrl(config.messageBoxId);
      var searchConditions = getCommonSearchConditions();
      var apiKey = getRelationApiKey();
      
      var payload = {
        status_cds: searchConditions.status_cds,
        per_page: searchConditions.per_page,
        page: searchConditions.page
      };

      var response = UrlFetchApp.fetch(apiUrl, {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload)
      });

      return JSON.parse(response.getContentText());
    };
    
    return safeApiCall(apiCall, 'チケット取得 (' + config.name + ')', {
      rateLimitWait: 100,
      maxRetries: 3
    });
  },
  
  /**
   * チケット分類取得
   * @param {Object} config 自治体設定
   * @return {Array} チケット分類配列
   */
  fetchCaseCategories: function(config) {
    validateData(config, 'config', { required: true, type: 'object' });
    validateData(config.messageBoxId, 'messageBoxId', { required: true });
    
    var apiCall = function() {
      var apiUrl = buildCaseCategoriesUrl(config.messageBoxId);
      var params = '?per_page=100&page=1';
      var apiKey = getRelationApiKey();

      var response = UrlFetchApp.fetch(apiUrl + params, {
        method: 'get',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        }
      });

      return JSON.parse(response.getContentText());
    };
    
    return safeApiCall(apiCall, 'チケット分類取得 (' + config.name + ')', {
      rateLimitWait: 100,
      maxRetries: 3
    });
  },
  
  /**
   * ラベル取得
   * @param {Object} config 自治体設定
   * @return {Array} ラベル配列
   */
  fetchLabels: function(config) {
    validateData(config, 'config', { required: true, type: 'object' });
    validateData(config.messageBoxId, 'messageBoxId', { required: true });
    
    var apiCall = function() {
      var apiUrl = buildLabelsUrl(config.messageBoxId);
      var params = '?per_page=100&page=1';
      var apiKey = getRelationApiKey();

      var response = UrlFetchApp.fetch(apiUrl + params, {
        method: 'get',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        }
      });

      return JSON.parse(response.getContentText());
    };
    
    return safeApiCall(apiCall, 'ラベル取得 (' + config.name + ')', {
      rateLimitWait: 100,
      maxRetries: 3
    });
  },
  
  /**
   * メッセージボックス一覧取得
   * @return {Array} メッセージボックス配列
   */
  fetchMessageBoxes: function() {
    var apiCall = function() {
      var apiUrl = buildMessageBoxesUrl();
      var apiKey = getRelationApiKey();

      var response = UrlFetchApp.fetch(apiUrl, {
        method: 'get',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        }
      });

      return JSON.parse(response.getContentText());
    };
    
    return safeApiCall(apiCall, 'メッセージボックス一覧取得', {
      rateLimitWait: 100,
      maxRetries: 3
    });
  }
};

/**
 * スプレッドシートサービス
 */
var SpreadsheetService = {
  
  /**
   * シート初期化
   * @param {string} sheetName シート名
   * @param {Array} headers ヘッダー配列
   * @param {string} title タイトル
   * @return {Sheet} 初期化されたシート
   */
  initializeSheet: function(sheetName, headers, title) {
    return wrapWithErrorHandling(function() {
      return initializeSheet(sheetName, headers, title);
    }, 'シート初期化', 'シートの初期化に失敗しました: ' + sheetName)();
  },
  
  /**
   * データを一括書き込み
   * @param {Sheet} sheet 対象シート
   * @param {Array} data データ配列
   * @param {number} startRow 開始行
   * @param {number} startCol 開始列
   * @return {Object} 書き込み結果
   */
  batchWrite: function(sheet, data, startRow, startCol) {
    validateData(sheet, 'sheet', { required: true });
    validateData(data, 'data', { required: true, isArray: true });
    
    return wrapWithErrorHandling(function() {
      if (data.length === 0) {
        return { writtenRows: 0, batches: 0 };
      }
      
      var range = sheet.getRange(startRow, startCol, data.length, data[0].length);
      range.setValues(data);
      
      return { 
        writtenRows: data.length, 
        batches: 1,
        nextRow: startRow + data.length
      };
    }, 'データ書き込み', 'データの書き込みに失敗しました')();
  },
  
  /**
   * 進捗更新
   * @param {Range} progressCell 進捗セル
   * @param {string} message メッセージ
   */
  updateProgress: function(progressCell, message) {
    if (!progressCell) return;
    
    wrapWithErrorHandling(function() {
      progressCell.setValue(message);
      progressCell.setFontWeight('bold');
      SpreadsheetApp.flush();
    }, '進捗更新', null, { suppressUserAlert: true })();
  },
  
  /**
   * セル範囲の書式設定
   * @param {Sheet} sheet シート
   * @param {number} startRow 開始行
   * @param {number} startCol 開始列
   * @param {number} numRows 行数
   * @param {number} numCols 列数
   * @param {Object} format 書式設定
   */
  formatRange: function(sheet, startRow, startCol, numRows, numCols, format) {
    wrapWithErrorHandling(function() {
      var range = sheet.getRange(startRow, startCol, numRows, numCols);
      
      if (format.numberFormat) {
        range.setNumberFormat(format.numberFormat);
      }
      
      if (format.dataValidation) {
        range.setDataValidation(format.dataValidation);
      }
      
      if (format.background) {
        range.setBackground(format.background);
      }
      
      if (format.fontColor) {
        range.setFontColor(format.fontColor);
      }
      
      if (format.fontWeight) {
        range.setFontWeight(format.fontWeight);
      }
    }, 'セル書式設定', null, { suppressUserAlert: true })();
  }
};

/**
 * 設定管理サービス
 */
var ConfigService = {
  
  /**
   * 自治体設定を取得
   * @param {boolean} includeWithoutSlack Slack未設定を含むかどうか
   * @return {Object} 自治体設定オブジェクト
   */
  getMunicipalityConfigs: function(includeWithoutSlack) {
    return wrapWithErrorHandling(function() {
      return loadMunicipalityConfigFromSheet(includeWithoutSlack);
    }, '自治体設定取得', '自治体設定の読み込みに失敗しました。受信箱シートを確認してください。')();
  },
  
  /**
   * チケット分類マップを取得
   * @param {string} messageBoxId メッセージボックスID
   * @return {Object} チケット分類マップ
   */
  getCaseCategoriesMap: function(messageBoxId) {
    return wrapWithErrorHandling(function() {
      return getCaseCategoriesMap(messageBoxId);
    }, 'チケット分類マップ取得', 'チケット分類データの読み込みに失敗しました', {
      defaultReturn: {}
    })();
  },
  
  /**
   * ラベルマップを取得
   * @param {string} messageBoxId メッセージボックスID
   * @return {Object} ラベルマップ
   */
  getLabelsMap: function(messageBoxId) {
    return wrapWithErrorHandling(function() {
      return getLabelsMap(messageBoxId);
    }, 'ラベルマップ取得', 'ラベルデータの読み込みに失敗しました', {
      defaultReturn: {}
    })();
  }
};

/**
 * 通知サービス
 */
var NotificationService = {
  
  /**
   * 完了通知を表示
   * @param {string} title タイトル
   * @param {Object} result 処理結果
   */
  showCompletionAlert: function(title, result) {
    wrapWithErrorHandling(function() {
      var ui = SpreadsheetApp.getUi();
      var message = title + '\\n\\n';
      message += '成功: ' + result.successCount + '/' + result.totalCount + '件\\n';
      
      if (result.dataCount !== undefined) {
        message += '取得データ総数: ' + result.dataCount + '件\\n';
      }
      
      if (result.errors && result.errors.length > 0) {
        message += 'エラー: ' + result.errors.length + '件\\n\\n';
        message += result.errors.map(function(err) {
          return err.item ? (err.item.name + ': ' + err.error) : err.error;
        }).join('\\n');
      }
      
      ui.alert('実行結果', message, ui.ButtonSet.OK);
    }, '通知表示', null, { suppressUserAlert: true })();
  }
};
