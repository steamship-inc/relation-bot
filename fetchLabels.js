// re:lation APIから全自治体のラベル一覧を取得し、labelsシートに出力する
function fetchLabels() {
  // 全自治体の設定を取得（Slackチャンネル未設定も含む）
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    throw new Error('受信箱設定が見つかりません。📮受信箱取得を先に実行してください。');
  }

  // スクリプトプロパティからAPIキーを取得
  var apiKey = getRelationApiKey();

  // シート初期化
  var sheetInfo = initializeSheet(
    CONSTANTS.SHEET_NAMES.LABELS,
    '🏷️ラベル',
    ['受信箱ID', '自治体名', 'ラベルID', 'ラベル名', '色', '作成日']
  );

  // 初期進捗表示
  updateProgress(sheetInfo.progressCell, 0, Object.keys(configs).length);

  // バッチ処理で各自治体のラベルを取得
  var configList = Object.keys(configs).map(function(municipalityId) {
    return configs[municipalityId];
  });

  function fetchLabelsForMunicipality(config, index) {
    try {
      // ラベル一覧APIのエンドポイント
      var apiUrl = buildLabelsUrl(config.messageBoxId);
      var params = '?per_page=100&page=1';

      // APIリクエスト（GET）
      var response = UrlFetchApp.fetch(apiUrl + params, {
        method: 'get',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        }
      });

      var responseData = JSON.parse(response.getContentText());
      var labels = responseData.data || [];
      
      // データをシート形式に変換
      var labelsData = labels.map(function(label) {
        return [
          config.messageBoxId,     // 受信箱ID
          config.name,            // 自治体名
          label.label_id,         // ラベルID
          label.label_name,       // ラベル名
          label.color || '',      // 色
          formatDate(label.created_at) // 作成日
        ];
      });

      return {
        success: true,
        data: labelsData
      };

    } catch (error) {
      console.error('ラベル取得エラー - ' + config.name + ': ' + error.toString());
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  var result = processBatch(configList, fetchLabelsForMunicipality, {
    batchSize: CONSTANTS.BATCH_SIZE,
    waitTime: CONSTANTS.RATE_LIMIT_WAIT,
    progressCell: sheetInfo.progressCell,
    sheet: sheetInfo.sheet,
    startRow: sheetInfo.currentRow,
    columnCount: 6
  });

  // 結果表示
  var ui = SpreadsheetApp.getUi();
  var message = '全自治体ラベル取得完了\n\n';
  message += '成功: ' + result.successCount + '件の自治体\n';
  message += '取得ラベル総数: ' + result.allData.length + '件\n';
  
  if (result.errorList.length > 0) {
    message += 'エラー: ' + result.errorList.length + '件\n\n';
    message += 'エラー詳細:\n';
    for (var i = 0; i < Math.min(result.errorList.length, 5); i++) {
      message += '- ' + result.errorList[i].item.name + ': ' + result.errorList[i].error + '\n';
    }
    if (result.errorList.length > 5) {
      message += '他' + (result.errorList.length - 5) + '件\n';
    }
  }
  
  ui.alert('ラベル取得完了', message, ui.ButtonSet.OK);
}