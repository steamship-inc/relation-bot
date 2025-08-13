/**
 * バッチ処理ユーティリティ
 * 複数ファイルで重複していたバッチ処理ロジックを統合
 */

/**
 * バッチ処理プロセッサを作成
 * @param {Object} options 設定オプション
 * @param {number} options.batchSize バッチサイズ（デフォルト: 50）
 * @param {number} options.waitTime 待機時間（ミリ秒、デフォルト: 60000）
 * @param {Range} options.progressCell 進捗表示セル
 * @param {string} options.progressPrefix 進捗メッセージのプレフィックス
 * @return {Object} バッチプロセッサオブジェクト
 */
function createBatchProcessor(options) {
  var batchSize = options.batchSize || 50;
  var waitTime = options.waitTime || 60000;
  var progressCell = options.progressCell;
  var progressPrefix = options.progressPrefix || '進捗';
  
  return {
    /**
     * アイテムをバッチ処理する
     * @param {Array} items 処理対象のアイテム配列
     * @param {Function} processingFunction 各アイテムを処理する関数
     * @return {Array} 処理結果の配列
     */
    process: function(items, processingFunction) {
      var results = [];
      var errors = [];
      var totalItems = items.length;
      
      console.log('バッチ処理開始: ' + totalItems + '件');
      
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        
        // バッチ開始時の進捗表示
        if (i % batchSize === 0) {
          var batchStart = i + 1;
          var batchEnd = Math.min(i + batchSize, totalItems);
          updateProgress(progressCell, progressPrefix, batchStart, batchEnd, totalItems);
          console.log('バッチ開始: ' + batchStart + '-' + batchEnd + '/' + totalItems);
        }
        
        try {
          var result = processingFunction(item, i);
          if (result) {
            results.push(result);
          }
        } catch (error) {
          var errorInfo = {
            item: item,
            index: i,
            error: error.toString()
          };
          errors.push(errorInfo);
          console.error('アイテム処理エラー [' + i + ']: ' + error.toString());
          
          // エラー時の進捗表示
          updateProgress(progressCell, progressPrefix, i + 1, totalItems, totalItems, item.name || ('アイテム' + i));
        }
        
        // レート制限対策: バッチ終了時に待機
        if ((i + 1) % batchSize === 0 && i < items.length - 1) {
          console.log('レート制限対策: ' + (waitTime / 1000) + '秒待機...');
          updateProgress(progressCell, 'APIレート制限対策', null, null, null, (waitTime / 1000) + '秒待機中');
          SpreadsheetApp.flush();
          Utilities.sleep(waitTime);
        }
      }
      
      // 最終進捗表示
      updateProgress(progressCell, '完了', results.length, totalItems, totalItems);
      SpreadsheetApp.flush();
      
      console.log('バッチ処理完了: ' + results.length + '/' + totalItems + '件成功');
      if (errors.length > 0) {
        console.log('エラー件数: ' + errors.length);
      }
      
      return {
        results: results,
        errors: errors,
        totalProcessed: items.length,
        successCount: results.length,
        errorCount: errors.length
      };
    },
    
    /**
     * データをバッチ単位でシートに書き込む
     * @param {Sheet} sheet 対象シート
     * @param {Array} allData 全データ配列
     * @param {number} startRow 開始行
     * @param {number} startCol 開始列
     * @return {Object} 書き込み結果
     */
    batchWrite: function(sheet, allData, startRow, startCol) {
      if (!allData || allData.length === 0) {
        console.log('書き込むデータがありません');
        return { writtenRows: 0, batches: 0 };
      }
      
      var totalBatches = Math.ceil(allData.length / batchSize);
      var currentRow = startRow;
      var writtenRows = 0;
      
      console.log('バッチ書き込み開始: ' + allData.length + '件を' + totalBatches + 'バッチで処理');
      
      for (var i = 0; i < allData.length; i += batchSize) {
        var batchData = allData.slice(i, i + batchSize);
        var batchNumber = Math.floor(i / batchSize) + 1;
        
        if (batchData.length > 0) {
          var range = sheet.getRange(currentRow, startCol, batchData.length, batchData[0].length);
          range.setValues(batchData);
          
          currentRow += batchData.length;
          writtenRows += batchData.length;
          
          console.log('バッチ' + batchNumber + '/' + totalBatches + ' 書き込み完了: ' + batchData.length + '件');
          updateProgress(progressCell, '書き込み', batchNumber, totalBatches, totalBatches);
        }
      }
      
      console.log('バッチ書き込み完了: ' + writtenRows + '行');
      return { 
        writtenRows: writtenRows, 
        batches: totalBatches,
        nextRow: currentRow
      };
    }
  };
}

/**
 * 進捗表示を更新
 * @param {Range} progressCell 進捗表示セル
 * @param {string} prefix メッセージプレフィックス
 * @param {number} current 現在の進捗
 * @param {number} end 終了値（バッチの場合）
 * @param {number} total 全体の数
 * @param {string} detail 詳細メッセージ
 */
function updateProgress(progressCell, prefix, current, end, total, detail) {
  if (!progressCell) return;
  
  var message = prefix + ': ';
  
  if (detail) {
    message += detail;
  } else if (end && current !== end) {
    // バッチ進捗の場合
    message += current + '-' + end + '/' + total + ' 処理中';
  } else if (current && total) {
    // 通常進捗の場合
    message += current + '/' + total;
    if (detail) {
      message += ' (' + detail + ')';
    }
  } else {
    message += '処理中...';
  }
  
  progressCell.setValue(message);
  progressCell.setFontWeight('bold');
  SpreadsheetApp.flush();
}

/**
 * シート初期化ユーティリティ
 * @param {string} sheetName シート名
 * @param {Array} headers ヘッダー行の配列
 * @param {string} title シートタイトル（A1セル）
 * @return {Sheet} 初期化されたシート
 */
function initializeSheet(sheetName, headers, title) {
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
  if (title) {
    var titleCell = sheet.getRange('A1');
    titleCell.setValue(title);
    titleCell.setFontWeight('bold');
  }
  
  // ヘッダー行を5行目に追加
  if (headers && headers.length > 0) {
    var headerRange = sheet.getRange(5, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('white');
  }
  
  SpreadsheetApp.flush();
  return sheet;
}
