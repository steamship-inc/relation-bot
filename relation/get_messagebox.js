// re:lation APIからメッセージボックス一覧を取得し、messageBoxシートに出力する
function fetchMessageBoxes() {
  // スクリプトプロパティからAPIキーを取得
  var apiKey = getRelationApiKey();

  // メッセージボックス一覧APIのエンドポイント
  var apiUrl = buildMessageBoxesUrl();

  // APIリクエスト（GET）
  var response = UrlFetchApp.fetch(apiUrl, {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    }
  });

  // レスポンス（JSON配列）をパース
  var messageBoxes = JSON.parse(response.getContentText());

  // 出力先シート（📮messageBox）を取得・新規作成・クリア
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('📮messageBox');

  // シートがなければ新規作成、既存シートあればデータクリア
  if (!sheet) {
    sheet = ss.insertSheet('📮messageBox');
  } else {
    sheet.clear();
  }

  // ヘッダー行を追加
  sheet.appendRow(['受信箱ID', '受信箱名', '色', '更新日時', 'アドレス帳ID']);

  // メッセージボックス一覧をシートに出力（受信箱名にリンクを追加）
  messageBoxes.forEach(function(messageBox, index) {
    var rowIndex = index + 2; // ヘッダー行の次から開始（1ベース）
    
    // 基本データを追加
    sheet.appendRow([
      messageBox.message_box_id,    // 受信箱ID
      messageBox.name,              // 受信箱名（後でリッチテキストに変換）
      messageBox.color,             // 受信箱の色
      messageBox.last_updated_at,   // 更新日時（ISO8601）
      messageBox.customer_group_id  // アドレス帳ID
    ]);
    
    // メッセージボックスURLを生成
    var messageBoxUrl = getRelationBaseUrl() + '/tickets/#/' + messageBox.message_box_id + '/tickets/open/p1';
    
    // 受信箱名列（B列）にリッチテキストでリンクを設定
    var richText = SpreadsheetApp.newRichTextValue()
      .setText(messageBox.name)
      .setLinkUrl(messageBoxUrl)
      .build();
    
    sheet.getRange(rowIndex, 2).setRichTextValue(richText);
  });

  // 取得件数をログ出力
  console.log('メッセージボックス ' + messageBoxes.length + ' 件を取得しました');
}
