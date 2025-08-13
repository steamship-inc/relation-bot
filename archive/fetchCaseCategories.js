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
      var caseCategories = JSON.parse(response.getContentText());

        
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
  var message = '全自治体チケット分類取得完了

';
  message += '成功: ' + processResult.successCount + '/' + municipalities.length + '件の自治体
';
  message += '取得分類総数: ' + totalCategories + '件
';
  
  if (processResult.errors.length > 0) {
    message += 'エラー: ' + processResult.errors.length + '件

';
    message += processResult.errors.map(function(err) {
      return err.item.name + ': ' + err.error;
    }).join('
');
  }
  
  ui.alert('実行結果', message, ui.ButtonSet.OK);
}
      
      // 50自治体ごとに進捗表示を更新とデータ書き込み
      if ((i + 1) % 50 === 0 || i === configIds.length - 1) {
        // 50自治体分のデータを書き込み
        if (batchData.length > 0) {
          var dataRange = sheet.getRange(currentRow, 1, batchData.length, 6);
          dataRange.setValues(batchData);
          currentRow += batchData.length;
          
          console.log('50自治体バッチ書き込み完了: ' + batchData.length + ' 件 (累計: ' + allCategoriesData.length + ' 件)');
          batchData = []; // バッチデータをリセット
        }
      }
      
      // エラー以外の個別ログは削除（50自治体ごとにまとめてログ出力）
      
    } catch (error) {
      errorList.push(config.name + ': ' + error.toString());
      console.error(config.name + ' のチケット分類取得エラー: ' + error.toString());
      
      // エラーの場合は必ず進捗表示を更新
      progressCell.setValue('進捗: ' + (i + 1) + '/' + totalMunicipalities + ' (エラー: ' + config.name + ')');
      SpreadsheetApp.flush(); // セル更新を即座に反映
    }
    
    // 50自治体ごとにレート制限回避のため待機
    // re:lation APIは1分間に60回制限なので、50自治体ごとに60秒待機で安全
    if ((i + 1) % 50 === 0 && i < configIds.length - 1) {
      console.log('50自治体処理完了 - レート制限回避のため60秒待機...');
      progressCell.setValue('API制限のため60秒待機');
      SpreadsheetApp.flush();
      Utilities.sleep(60000); // 60秒待機
    }
  }
  
  // 最終確認：残りのデータがあれば書き込み
  if (batchData.length > 0) {
    var dataRange = sheet.getRange(currentRow, 1, batchData.length, 6);
    dataRange.setValues(batchData);
    console.log('最終バッチ書き込み完了: ' + batchData.length + ' 件');
  }

  // 最終完了表示
  progressCell.setValue('完了: ' + successCount + '/' + totalMunicipalities);
  SpreadsheetApp.flush();
  
  console.log('全処理完了: ' + successCount + '/' + totalMunicipalities + ' 自治体');
  
  // 結果表示
  var ui = SpreadsheetApp.getUi();
  var message = '全自治体チケット分類取得完了\n\n';
  message += '成功: ' + successCount + '件の自治体\n';
  message += '取得チケット分類総数: ' + totalCategories + '件\n';
  if (errorList.length > 0) {
    message += 'エラー: ' + errorList.length + '件\n\n';
    message += errorList.join('\n');
  }
  
  ui.alert('実行結果', message, ui.ButtonSet.OK);
}
