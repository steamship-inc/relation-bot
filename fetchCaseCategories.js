// re:lation APIから全自治体のチケット分類一覧を取得し、caseCategoriesシートに出力する
function fetchCaseCategories() {
  // 全自治体の設定を取得（Slackチャンネル未設定も含む）
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    throw new Error('受信箱設定が見つかりません。📮受信箱取得を先に実行してください。');
  }

  // スクリプトプロパティからAPIキーを取得
  var apiKey = getRelationApiKey();

  // 出力先シート（🏷️チケット分類）を取得・新規作成・クリア
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('🏷️チケット分類');

  // シートがなければ新規作成、既存シートあればデータクリア
  if (!sheet) {
    sheet = ss.insertSheet('🏷️チケット分類');
  } else {
    sheet.clear();
  }
  
  // 対象シートをアクティブにする
  ss.setActiveSheet(sheet);

  // A1にシートタイトルを設定
  sheet.getRange('A1').setValue('🏷️チケット分類');
  sheet.getRange('A1').setFontWeight('bold');

  // 進捗表示用のセルを準備（C1セルに進捗を表示）
  var progressCell = sheet.getRange('C1');
  var totalMunicipalities = Object.keys(configs).length;
  progressCell.setValue('進捗: 0/' + totalMunicipalities);
  progressCell.setFontWeight('bold');
  SpreadsheetApp.flush(); // セル更新を即座に反映

  // ヘッダー行を5行目に追加
  sheet.getRange(5, 1, 1, 6).setValues([['受信箱ID', '自治体名', 'チケット分類ID', 'チケット分類名', '親分類ID', 'アーカイブ済み']]);
  sheet.getRange(5, 1, 1, 6).setFontWeight('bold');
  
  var totalCategories = 0;
  var successCount = 0;
  var errorList = [];
  var allCategoriesData = []; // 全データを格納する配列
  var batchData = []; // 50自治体分のデータを一時保存
  var currentRow = 6; // データ開始行（ヘッダーの下）
  
  // 各自治体のチケット分類を順次取得・統合
  var configIds = Object.keys(configs);
  
  for (var i = 0; i < configIds.length; i++) {
    var municipalityId = configIds[i];
    var config = configs[municipalityId];
    
    // 50自治体ごとのバッチ開始時に進捗表示
    if (i % 50 === 0) {
      var batchStart = i + 1;
      var batchEnd = Math.min(i + 50, configIds.length);
      progressCell.setValue(batchStart + '-' + batchEnd + '/' + totalMunicipalities + ' 処理中');
      SpreadsheetApp.flush();
    }
    
    try {
      // チケット分類一覧APIのエンドポイント
      var apiUrl = buildCaseCategoriesUrl(config.messageBoxId);

      // クエリパラメータ（1ページ最大100件）
      var params = '?per_page=100&page=1';

      // APIリクエスト（GET）
      var response = UrlFetchApp.fetch(apiUrl + params, {
        method: 'get',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        }
      });

      // レスポンス（JSON配列）をパース
      var caseCategories = JSON.parse(response.getContentText());

      // チケット分類データを配列に追加（一括処理用）
      caseCategories.forEach(function(category) {
        var categoryData = [
          config.messageBoxId,            // 受信箱ID
          config.name,                    // 自治体名
          category.case_category_id,      // チケット分類ID
          category.name,                  // チケット分類名（親 > 子 > 孫 形式）
          category.parent_id || '',       // 親分類ID（nullの場合は空文字）
          category.archived               // アーカイブ済みかどうか
        ];
        allCategoriesData.push(categoryData);
        batchData.push(categoryData);
      });
      
      totalCategories += caseCategories.length;
      successCount++;
      
      // 50自治体ごとに進捗表示を更新とデータ書き込み
      if ((i + 1) % 50 === 0 || i === configIds.length - 1) {
        // 50自治体分のデータを書き込み
        if (batchData.length > 0) {
          var dataRange = sheet.getRange(currentRow, 1, batchData.length, 6);
          dataRange.setValues(batchData);
          currentRow += batchData.length;
          
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
      progressCell.setValue('API制限のため60秒待機');
      SpreadsheetApp.flush();
      Utilities.sleep(60000); // 60秒待機
    }
  }
  
  // 最終確認：残りのデータがあれば書き込み
  if (batchData.length > 0) {
    var dataRange = sheet.getRange(currentRow, 1, batchData.length, 6);
    dataRange.setValues(batchData);
  }

  // 最終完了表示
  progressCell.setValue('完了: ' + successCount + '/' + totalMunicipalities);
  SpreadsheetApp.flush();
  
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
