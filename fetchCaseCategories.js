// re:lation APIから全自治体のチケット分類一覧を取得し、caseCategoriesシートに出力する
function fetchCaseCategories() {
  // 全自治体の設定を取得（Slackチャンネル未設定も含む）
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    throw new Error('受信箱設定が見つかりません。📮受信箱取得を先に実行してください。');
  }

  // シート初期化
  var sheetInfo = initializeSheet(
    CONSTANTS.SHEET_NAMES.CASE_CATEGORIES,
    '🏷️チケット分類',
    ['受信箱ID', '自治体名', 'チケット分類ID', 'チケット分類名', '親分類ID', 'アーカイブ済み']
  );

  // 初期進捗表示
  updateProgress(sheetInfo.progressCell, 0, Object.keys(configs).length);

  // バッチ処理で各自治体のチケット分類を取得
  var configList = Object.keys(configs).map(function(municipalityId) {
    return configs[municipalityId];
  });

  function fetchCategoriesForMunicipality(config, index) {
    var result = fetchCaseCategoriesData(config);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }
    
    var categories = result.data;
    
    // データをシート形式に変換
    var categoriesData = categories.map(function(category) {
      return [
        config.messageBoxId,                    // 受信箱ID
        config.name,                           // 自治体名
        category.case_category_id,             // チケット分類ID
        category.case_category_name,           // チケット分類名
        category.parent_case_category_id || '', // 親分類ID
        category.archived || false             // アーカイブ済み
      ];
    });

    return {
      success: true,
      data: categoriesData
    };
  }

  var result = processBatch(configList, fetchCategoriesForMunicipality, {
    batchSize: CONSTANTS.BATCH_SIZE,
    waitTime: CONSTANTS.RATE_LIMIT_WAIT,
    progressCell: sheetInfo.progressCell,
    sheet: sheetInfo.sheet,
    startRow: sheetInfo.currentRow,
    columnCount: 6
  });

  // 結果表示
  var ui = SpreadsheetApp.getUi();
  var message = '全自治体チケット分類取得完了\n\n';
  message += '成功: ' + result.successCount + '件の自治体\n';
  message += '取得分類総数: ' + result.allData.length + '件\n';
  
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
  
  ui.alert('チケット分類取得完了', message, ui.ButtonSet.OK);
}