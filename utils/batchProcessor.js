/**
 * バッチ処理用共通ユーティリティ
 */

/**
 * バッチ処理を実行する共通関数
 * @param {Array} items 処理対象のアイテム配列
 * @param {Function} processFunction 処理関数 (item, index) => data
 * @param {Object} options バッチ処理オプション
 * @returns {Array} 処理結果の配列
 */
function processBatch(items, processFunction, options) {
  var batchSize = options.batchSize || CONSTANTS.BATCH_SIZE;
  var waitTime = options.waitTime || CONSTANTS.RATE_LIMIT_WAIT;
  var progressCell = options.progressCell;
  var sheet = options.sheet;
  var startRow = options.startRow || CONSTANTS.DATA_START_ROW;
  var columnCount = options.columnCount;
  
  var allData = [];
  var batchData = [];
  var currentRow = startRow;
  var successCount = 0;
  var errorList = [];
  
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    
    // バッチ開始の進捗表示
    if (i % batchSize === 0) {
      var batchStart = i + 1;
      var batchEnd = Math.min(i + batchSize, items.length);
      updateProgress(progressCell, batchStart, items.length, batchStart + '-' + batchEnd + '処理中');
    }
    
    try {
      var result = processFunction(item, i);
      if (result && result.success) {
        successCount++;
        if (result.data && result.data.length > 0) {
          allData = allData.concat(result.data);
          batchData = batchData.concat(result.data);
        }
      }
      
      // バッチサイズごとにシートに書き込み
      if (batchData.length >= batchSize * 10 || i === items.length - 1) { // 約500行分溜まったら書き込み
        if (batchData.length > 0 && sheet) {
          var dataRange = sheet.getRange(currentRow, 1, batchData.length, columnCount);
          dataRange.setValues(batchData);
          currentRow += batchData.length;
          batchData = [];
        }
      }
      
    } catch (error) {
      errorList.push({
        item: item,
        error: error.toString()
      });
      console.error('処理エラー:', error.toString());
    }
    
    // レート制限対応：50件ごとに待機
    if ((i + 1) % batchSize === 0 && i < items.length - 1) {
      updateProgress(progressCell, i + 1, items.length, 'API制限のため60秒待機');
      Utilities.sleep(waitTime);
    }
  }
  
  // 最終確認：残りのデータがあれば書き込み
  if (batchData.length > 0 && sheet) {
    var dataRange = sheet.getRange(currentRow, 1, batchData.length, columnCount);
    dataRange.setValues(batchData);
  }

  // 最終完了表示
  updateProgress(progressCell, successCount, items.length, '完了');
  
  return {
    allData: allData,
    successCount: successCount,
    errorList: errorList,
    totalItems: items.length
  };
}