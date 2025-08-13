/**
 * re:lation ラベル取得機能
 * menu.js の fetchLabels に対応
 */

/**
 * re:lation APIから全自治体のラベル一覧を取得し、🏷️ラベルシートに出力する
 */
function fetchLabels() {
  // 全自治体の設定を取得（Slackチャンネル未設定も含む）
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    throw new Error('受信箱設定が見つかりません。📮受信箱取得を先に実行してください。');
  }

  // シート初期化
  var headers = ['受信箱ID', '自治体名', 'ラベルID', 'ラベル名', '色', '作成日'];
  var sheetInfo = initializeSheet('🏷️ラベル', '🏷️ラベル', headers);
  var sheet = sheetInfo.sheet;
  var progressCell = sheetInfo.progressCell;
  
  var totalLabels = 0;
  var allLabelsData = [];
  var currentRow = 6; // データ開始行（ヘッダーの下）
  
  // バッチ処理設定
  var batchOptions = {
    batchSize: 50,
    waitTime: 60000,
    progressCell: progressCell,
    onBatchComplete: function(batchData, index) {
      // 50自治体分のデータを書き込み
      currentRow = writeBatchData(sheet, batchData, currentRow, 6);
      console.log('50自治体バッチ書き込み完了: ' + batchData.length + ' 件 (累計: ' + allLabelsData.length + ' 件)');
    }
  };
  
  // 各自治体のラベルを処理
  var configIds = Object.keys(configs);
  var result = processBatch(configIds, function(municipalityId, index) {
    var config = configs[municipalityId];
    
    // ラベル一覧APIを呼び出し
    var labels = callRelationApi(buildLabelsUrl(config.messageBoxId), 'get', {
      per_page: 100,
      page: 1
    });

    // ラベルデータを配列に変換
    var labelDataArray = labels.map(function(label) {
      return [
        config.messageBoxId,            // 受信箱ID
        config.name,                    // 自治体名
        label.label_id || label.id,     // ラベルID（APIレスポンスによって異なる可能性）
        label.name,                     // ラベル名
        label.color || '',              // 色（nullの場合は空文字）
        label.created_at || ''          // 作成日（nullの場合は空文字）
      ];
    });
    
    totalLabels += labels.length;
    allLabelsData = allLabelsData.concat(labelDataArray);
    
    return labelDataArray;
    
  }, batchOptions);
  
  // 最終確認：残りのデータがあれば書き込み
  var finalBatchData = allLabelsData.slice(currentRow - 6);
  if (finalBatchData.length > 0) {
    writeBatchData(sheet, finalBatchData, currentRow, 6);
    console.log('最終バッチ書き込み完了: ' + finalBatchData.length + ' 件');
  }

  // 処理完了表示
  showCompletionResult(result.successCount, configIds.length, result.errorList, '全自治体ラベル', progressCell);
  
  // 追加の結果情報
  var ui = SpreadsheetApp.getUi();
  var message = '全自治体ラベル取得完了\n\n';
  message += '成功: ' + result.successCount + '/' + configIds.length + ' 自治体\n';
  message += '取得ラベル総数: ' + totalLabels + ' 件\n';
  if (result.errorList.length > 0) {
    message += 'エラー: ' + result.errorList.length + ' 件\n\n';
    message += result.errorList.join('\n');
  }
  
  ui.alert('処理完了', message, ui.ButtonSet.OK);
}