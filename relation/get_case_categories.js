// re:lation APIからチケット分類一覧を取得し、caseCategoriesシートに出力する
function fetchCaseCategories() {
  // 現在の自治体設定を取得（デフォルトは山鹿市）
  var configs = getAllMunicipalityConfigs();
  var config = configs['yamaga'];
  var messageBoxId = config.messageBoxId;

  // スクリプトプロパティからAPIキーを取得
  var apiKey = getRelationApiKey();

  // チケット分類一覧APIのエンドポイント
  var apiUrl = buildCaseCategoriesUrl(messageBoxId);

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

  // 出力先シート（🏷️caseCategories）を取得・新規作成・クリア
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('🏷️caseCategories');

  // シートがなければ新規作成、既存シートあればデータクリア
  if (!sheet) {
    sheet = ss.insertSheet('🏷️caseCategories');
  } else {
    sheet.clear();
  }

  // ヘッダー行を追加
  sheet.appendRow(['チケット分類ID', 'チケット分類名', '親分類ID', 'アーカイブ済み']);

  // チケット分類一覧をシートに出力
  caseCategories.forEach(function(category, index) {
    var rowIndex = index + 2; // ヘッダー行の次から開始（1ベース）
    
    // 基本データを追加
    sheet.appendRow([
      category.case_category_id,  // チケット分類ID
      category.name,              // チケット分類名（親 > 子 > 孫 形式）
      category.parent_id || '',   // 親分類ID（nullの場合は空文字）
      category.archived           // アーカイブ済みかどうか
    ]);
  });

  // 取得件数をログ出力
  console.log(config.name + ' - チケット分類 ' + caseCategories.length + ' 件を取得しました');
}
