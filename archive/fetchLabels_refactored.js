// re:lation APIから全自治体のラベル一覧を取得し、labelsシートに出力する
function fetchLabels() {
  // 全自治体の設定を取得（Slackチャンネル未設定も含む）
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    throw new Error('受信箱設定が見つかりません。📮受信箱取得を先に実行してください。');
  }

  // シートを初期化
  var sheet = initializeSheet(
    getSheetName('LABELS'),
    getHeaders('LABELS'), 
    '🏷️ラベル'
  );
  
  // 進捗表示用のセルを準備
  var progressCell = sheet.getRange(getConstant('PROGRESS.CELL_POSITION'));
  
  // バッチプロセッサを作成
  var processor = createBatchProcessor({
    batchSize: getConstant('BATCH_SIZE'),
    waitTime: getConstant('RATE_LIMIT_WAIT'),
    progressCell: progressCell,
    progressPrefix: 'ラベル取得'
  });
  
  // 自治体設定を配列に変換
  var municipalities = Object.keys(configs).map(function(key) {
    return configs[key];
  });
  
  // 各自治体のラベルを処理する関数
  function processMunicipality(config, index) {
    try {
      // ラベル一覧APIのエンドポイント
      var apiUrl = buildLabelsUrl(config.messageBoxId);
      var params = '?per_page=100&page=1';
      var apiKey = getRelationApiKey();

      // APIリクエスト（GET）
      var response = UrlFetchApp.fetch(apiUrl + params, {
        method: 'get',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        }
      });

      // レスポンス（JSON配列）をパース
      var labels = JSON.parse(response.getContentText());
      
      console.log('自治体: ' + config.name + ', ラベル数: ' + labels.length);
      
      // ラベルデータを変換
      var labelDataArray = labels.map(function(label) {
        return [
          config.messageBoxId,     // 受信箱ID
          config.name,             // 自治体名
          label.label_id,          // ラベルID
          label.name,              // ラベル名
          label.color_cd || '',    // 色
          label.sort_order || 0    // 並び順
        ];
      });
      
      return {
        municipalityName: config.name,
        labelCount: labels.length,
        labelData: labelDataArray
      };
      
    } catch (error) {
      console.error(config.name + ' のラベル取得エラー: ' + error.toString());
      throw error;
    }
  }
  
  // バッチ処理実行
  var processResult = processor.process(municipalities, processMunicipality);
  
  // 結果を集計
  var allLabelsData = [];
  var totalLabels = 0;
  
  processResult.results.forEach(function(result) {
    allLabelsData = allLabelsData.concat(result.labelData);
    totalLabels += result.labelCount;
  });
  
  // データを一括書き込み
  if (allLabelsData.length > 0) {
    processor.batchWrite(sheet, allLabelsData, 6, 1);
  }
  
  // 結果表示
  var ui = SpreadsheetApp.getUi();
  var message = '全自治体ラベル取得完了\\n\\n';
  message += '成功: ' + processResult.successCount + '/' + municipalities.length + '件の自治体\\n';
  message += '取得ラベル総数: ' + totalLabels + '件\\n';
  
  if (processResult.errors.length > 0) {
    message += 'エラー: ' + processResult.errors.length + '件\\n\\n';
    message += processResult.errors.map(function(err) {
      return err.item.name + ': ' + err.error;
    }).join('\\n');
  }
  
  ui.alert('実行結果', message, ui.ButtonSet.OK);
}
