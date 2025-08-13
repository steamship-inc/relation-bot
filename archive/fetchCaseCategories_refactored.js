// re:lation APIから全自治体のチケット分類一覧を取得し、caseCategoriesシートに出力する
function fetchCaseCategories() {
  // 全自治体の設定を取得（Slackチャンネル未設定も含む）
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    throw new Error('受信箱設定が見つかりません。📮受信箱取得を先に実行してください。');
  }

  // シートを初期化
  var sheet = initializeSheet(
    getSheetName('CASE_CATEGORIES'),
    getHeaders('CASE_CATEGORIES'), 
    '🏷️チケット分類'
  );
  
  // 進捗表示用のセルを準備
  var progressCell = sheet.getRange(getConstant('PROGRESS.CELL_POSITION'));
  
  // バッチプロセッサを作成
  var processor = createBatchProcessor({
    batchSize: getConstant('BATCH_SIZE'),
    waitTime: getConstant('RATE_LIMIT_WAIT'),
    progressCell: progressCell,
    progressPrefix: 'チケット分類取得'
  });
  
  // 自治体設定を配列に変換
  var municipalities = Object.keys(configs).map(function(key) {
    return configs[key];
  });
  
  // 各自治体のチケット分類を処理する関数
  function processMunicipality(config, index) {
    try {
      // チケット分類一覧APIのエンドポイント
      var apiUrl = buildCaseCategoriesUrl(config.messageBoxId);
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
      var categories = JSON.parse(response.getContentText());
      
      console.log('自治体: ' + config.name + ', チケット分類数: ' + categories.length);
      
      // チケット分類データを変換
      var categoryDataArray = categories.map(function(category) {
        return [
          config.messageBoxId,        // 受信箱ID
          config.name,                // 自治体名
          category.case_category_id,  // チケット分類ID
          category.name,              // チケット分類名
          category.parent_id || '',   // 親分類ID
          category.archived || false  // アーカイブ済み
        ];
      });
      
      return {
        municipalityName: config.name,
        categoryCount: categories.length,
        categoryData: categoryDataArray
      };
      
    } catch (error) {
      console.error(config.name + ' のチケット分類取得エラー: ' + error.toString());
      throw error;
    }
  }
  
  // バッチ処理実行
  var processResult = processor.process(municipalities, processMunicipality);
  
  // 結果を集計
  var allCategoriesData = [];
  var totalCategories = 0;
  
  processResult.results.forEach(function(result) {
    allCategoriesData = allCategoriesData.concat(result.categoryData);
    totalCategories += result.categoryCount;
  });
  
  // データを一括書き込み
  if (allCategoriesData.length > 0) {
    processor.batchWrite(sheet, allCategoriesData, 6, 1);
  }
  
  // 結果表示
  var ui = SpreadsheetApp.getUi();
  var message = '全自治体チケット分類取得完了\\n\\n';
  message += '成功: ' + processResult.successCount + '/' + municipalities.length + '件の自治体\\n';
  message += '取得分類総数: ' + totalCategories + '件\\n';
  
  if (processResult.errors.length > 0) {
    message += 'エラー: ' + processResult.errors.length + '件\\n\\n';
    message += processResult.errors.map(function(err) {
      return err.item.name + ': ' + err.error;
    }).join('\\n');
  }
  
  ui.alert('実行結果', message, ui.ButtonSet.OK);
}
