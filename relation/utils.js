/**
 * re:lation API共通ユーティリティモジュール
 * 重複する処理パターンを統一管理
 */

/**
 * シート初期化の共通処理
 * @param {string} sheetName シート名
 * @param {string} title シートタイトル
 * @param {Array} headers ヘッダー配列
 * @return {Object} 初期化済みシートとプログレスセルのオブジェクト
 */
function initializeSheet(sheetName, title, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  
  // 対象シートをアクティブにする
  ss.setActiveSheet(sheet);

  // A1セルにシートタイトルを表示
  var titleCell = sheet.getRange('A1');
  titleCell.setValue(title);
  titleCell.setFontWeight('bold');
  SpreadsheetApp.flush();

  // 進捗表示用のセルを準備（C1セルに進捗を表示）
  var progressCell = sheet.getRange('C1');
  progressCell.setFontWeight('bold');
  SpreadsheetApp.flush();

  // ヘッダー行を5行目に追加
  if (headers && headers.length > 0) {
    sheet.getRange(5, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(5, 1, 1, headers.length).setFontWeight('bold');
  }
  
  return {
    sheet: sheet,
    progressCell: progressCell
  };
}

/**
 * 進捗表示の共通処理
 * @param {Range} progressCell 進捗表示セル
 * @param {number} current 現在の処理数
 * @param {number} total 総数
 * @param {string} status 状態メッセージ（オプション）
 */
function updateProgress(progressCell, current, total, status) {
  var message = '進捗: ' + current + '/' + total;
  if (status) {
    message += ' (' + status + ')';
  }
  progressCell.setValue(message);
  SpreadsheetApp.flush();
}

/**
 * バッチ進捗表示の共通処理
 * @param {Range} progressCell 進捗表示セル
 * @param {number} batchStart バッチ開始番号
 * @param {number} batchEnd バッチ終了番号
 * @param {number} total 総数
 */
function updateBatchProgress(progressCell, batchStart, batchEnd, total) {
  progressCell.setValue(batchStart + '-' + batchEnd + '/' + total + ' 処理中');
  SpreadsheetApp.flush();
  console.log('50自治体バッチ開始: ' + batchStart + '-' + batchEnd + '/' + total);
}

/**
 * API呼び出しの共通処理
 * @param {string} url API URL
 * @param {string} method HTTPメソッド（デフォルト: 'get'）
 * @param {Object} params クエリパラメータ（オプション）
 * @return {Object} APIレスポンス（JSON）
 */
function callRelationApi(url, method, params) {
  method = method || 'get';
  var apiKey = getRelationApiKey();
  
  var finalUrl = url;
  if (params) {
    var queryString = Object.keys(params).map(function(key) {
      return key + '=' + encodeURIComponent(params[key]);
    }).join('&');
    finalUrl += '?' + queryString;
  }
  
  var response = UrlFetchApp.fetch(finalUrl, {
    method: method,
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    }
  });
  
  return JSON.parse(response.getContentText());
}

/**
 * バッチ書き込みの共通処理
 * @param {Sheet} sheet 対象シート
 * @param {Array} batchData 書き込みデータ
 * @param {number} currentRow 開始行
 * @param {number} columnCount 列数
 * @return {number} 次の書き込み開始行
 */
function writeBatchData(sheet, batchData, currentRow, columnCount) {
  if (batchData.length > 0) {
    var dataRange = sheet.getRange(currentRow, 1, batchData.length, columnCount);
    dataRange.setValues(batchData);
    console.log('バッチ書き込み完了: ' + batchData.length + ' 件');
    return currentRow + batchData.length;
  }
  return currentRow;
}

/**
 * バッチ処理の共通制御
 * @param {Array} items 処理対象配列
 * @param {Function} processor 個別処理関数
 * @param {Object} options オプション設定
 */
function processBatch(items, processor, options) {
  options = options || {};
  var batchSize = options.batchSize || 50;
  var waitTime = options.waitTime || 60000;
  var progressCell = options.progressCell;
  var onBatchComplete = options.onBatchComplete;
  
  var successCount = 0;
  var errorList = [];
  var allData = [];
  var batchData = [];
  
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    
    // バッチ開始時の進捗表示
    if (i % batchSize === 0 && progressCell) {
      var batchStart = i + 1;
      var batchEnd = Math.min(i + batchSize, items.length);
      updateBatchProgress(progressCell, batchStart, batchEnd, items.length);
    }
    
    try {
      var result = processor(item, i);
      if (result) {
        allData = allData.concat(result);
        batchData = batchData.concat(result);
      }
      successCount++;
      
      // バッチ完了時の処理
      if ((i + 1) % batchSize === 0 || i === items.length - 1) {
        if (onBatchComplete && batchData.length > 0) {
          onBatchComplete(batchData, i);
          batchData = []; // リセット
        }
      }
      
    } catch (error) {
      errorList.push(item.name + ': ' + error.toString());
      console.error('処理エラー: ' + error.toString());
      
      if (progressCell) {
        updateProgress(progressCell, i + 1, items.length, 'エラー: ' + item.name);
      }
    }
    
    // レート制限対策の待機
    if ((i + 1) % batchSize === 0 && i < items.length - 1) {
      console.log(batchSize + '件処理完了 - レート制限回避のため' + (waitTime/1000) + '秒待機...');
      if (progressCell) {
        progressCell.setValue('API制限のため' + (waitTime/1000) + '秒待機');
        SpreadsheetApp.flush();
      }
      Utilities.sleep(waitTime);
    }
  }
  
  return {
    successCount: successCount,
    errorList: errorList,
    allData: allData
  };
}

/**
 * 処理完了時の結果表示
 * @param {number} successCount 成功数
 * @param {number} total 総数
 * @param {Array} errorList エラーリスト
 * @param {string} processType 処理種別
 * @param {Range} progressCell 進捗表示セル
 */
function showCompletionResult(successCount, total, errorList, processType, progressCell) {
  if (progressCell) {
    updateProgress(progressCell, successCount, total, '完了');
  }
  
  console.log('全処理完了: ' + successCount + '/' + total + ' 自治体');
  
  var ui = SpreadsheetApp.getUi();
  var message = processType + '取得完了\n\n';
  message += '成功: ' + successCount + '/' + total + ' 自治体\n';
  
  if (errorList.length > 0) {
    message += 'エラー: ' + errorList.length + ' 件\n\n';
    message += 'エラー詳細:\n' + errorList.join('\n');
  }
  
  ui.alert('処理完了', message, ui.ButtonSet.OK);
}