/**
 * re:lation チケット分類取得機能
 * menu.js の fetchCaseCategories に対応
 */

/**
 * re:lation APIから全自治体のチケット分類一覧を取得し、🏷️チケット分類シートに出力する
 */
function fetchCaseCategories() {
  // 全自治体の設定を取得（Slackチャンネル未設定も含む）
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    throw new Error('受信箱設定が見つかりません。📮受信箱取得を先に実行してください。');
  }

  // シート初期化
  var headers = ['受信箱ID', '自治体名', 'チケット分類ID', 'チケット分類名', '親分類ID', 'アーカイブ済み'];
  var sheetInfo = initializeSheet('🏷️チケット分類', '🏷️チケット分類', headers);
  var sheet = sheetInfo.sheet;
  var progressCell = sheetInfo.progressCell;
  
  var totalCategories = 0;
  var allCategoriesData = [];
  var currentRow = 6; // データ開始行（ヘッダーの下）
  
  // バッチ処理設定
  var batchOptions = {
    batchSize: 50,
    waitTime: 60000,
    progressCell: progressCell,
    onBatchComplete: function(batchData, index) {
      // 50自治体分のデータを書き込み
      currentRow = writeBatchData(sheet, batchData, currentRow, 6);
      console.log('50自治体バッチ書き込み完了: ' + batchData.length + ' 件 (累計: ' + allCategoriesData.length + ' 件)');
    }
  };
  
  // 各自治体のチケット分類を処理
  var configIds = Object.keys(configs);
  var result = processBatch(configIds, function(municipalityId, index) {
    var config = configs[municipalityId];
    
    // チケット分類一覧APIを呼び出し
    var caseCategories = callRelationApi(buildCaseCategoriesUrl(config.messageBoxId), 'get', {
      per_page: 100,
      page: 1
    });

    // チケット分類データを配列に変換
    var categoryDataArray = caseCategories.map(function(category) {
      return [
        config.messageBoxId,            // 受信箱ID
        config.name,                    // 自治体名
        category.case_category_id,      // チケット分類ID
        category.name,                  // チケット分類名（親 > 子 > 孫 形式）
        category.parent_id || '',       // 親分類ID（nullの場合は空文字）
        category.archived               // アーカイブ済みかどうか
      ];
    });
    
    totalCategories += caseCategories.length;
    allCategoriesData = allCategoriesData.concat(categoryDataArray);
    
    return categoryDataArray;
    
  }, batchOptions);
  
  // 最終確認：残りのデータがあれば書き込み
  var finalBatchData = allCategoriesData.slice(currentRow - 6);
  if (finalBatchData.length > 0) {
    writeBatchData(sheet, finalBatchData, currentRow, 6);
    console.log('最終バッチ書き込み完了: ' + finalBatchData.length + ' 件');
  }

  // 処理完了表示
  showCompletionResult(result.successCount, configIds.length, result.errorList, '全自治体チケット分類', progressCell);
  
  // 追加の結果情報
  var ui = SpreadsheetApp.getUi();
  var message = '全自治体チケット分類取得完了\n\n';
  message += '成功: ' + result.successCount + '/' + configIds.length + ' 自治体\n';
  message += '取得分類総数: ' + totalCategories + ' 件\n';
  if (result.errorList.length > 0) {
    message += 'エラー: ' + result.errorList.length + ' 件\n\n';
    message += result.errorList.join('\n');
  }
  
  ui.alert('処理完了', message, ui.ButtonSet.OK);
}