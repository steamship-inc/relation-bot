// re:lation APIから全自治体のチケット分類一覧を取得し、caseCategoriesシートに出力する
function fetchCaseCategories() {
  // 全自治体の設定を取得（Slackチャンネル未設定も含む）
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    throw new Error('自治体設定が見つかりません。📮受信箱一覧更新を先に実行してください。');
  }

  // スクリプトプロパティからAPIキーを取得
  var apiKey = getRelationApiKey();

  // 出力先シート（🏷️caseCategories）を取得・新規作成・クリア
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('🏷️caseCategories');

  // シートがなければ新規作成、既存シートあればデータクリア
  if (!sheet) {
    sheet = ss.insertSheet('🏷️caseCategories');
  } else {
    sheet.clear();
  }
  
  // 対象シートをアクティブにする
  ss.setActiveSheet(sheet);

  // ヘッダー行を追加
  sheet.appendRow(['受信箱ID', '自治体名', 'チケット分類ID', 'チケット分類名', '親分類ID', 'アーカイブ済み']);
  
  var totalCategories = 0;
  var successCount = 0;
  var errorList = [];
  
  // 各自治体のチケット分類を順次取得・統合
  var configIds = Object.keys(configs);
  
  for (var i = 0; i < configIds.length; i++) {
    var municipalityId = configIds[i];
    var config = configs[municipalityId];
    
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

      // チケット分類一覧をシートに出力
      caseCategories.forEach(function(category) {
        sheet.appendRow([
          config.messageBoxId,            // 受信箱ID
          config.name,                    // 自治体名
          category.case_category_id,      // チケット分類ID
          category.name,                  // チケット分類名（親 > 子 > 孫 形式）
          category.parent_id || '',       // 親分類ID（nullの場合は空文字）
          category.archived               // アーカイブ済みかどうか
        ]);
      });
      
      totalCategories += caseCategories.length;
      successCount++;
      
      console.log(config.name + ' - チケット分類 ' + caseCategories.length + ' 件を取得しました');
      
    } catch (error) {
      errorList.push(config.name + ': ' + error.toString());
      console.error(config.name + ' のチケット分類取得エラー: ' + error.toString());
    }
  }
  
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
