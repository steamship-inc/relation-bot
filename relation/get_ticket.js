// re:lation APIから未対応チケット一覧を取得し、openTicketシートに出力する
function fetchOpenTickets() {
  var subdomain = 'steamship';
  var messageBoxId = '629';

  // スクリプトプロパティからAPIキーを取得
  var apiKey = PropertiesService.getScriptProperties().getProperty('RELATION_API_KEY');

  // チケット検索APIのエンドポイント
  var apiUrl = 'https://' + subdomain + '.relationapp.jp/api/v2/' + messageBoxId + '/tickets/search';

  // 検索条件（未対応のみ、最大50件、1ページ目）
  var payload = {
    status_cds: ["open"], // チケットステータス: 未対応
    per_page: 50,          // 1ページ最大件数
    page: 1                // ページ番号
  };

  // APIリクエスト（POST）
  var response = UrlFetchApp.fetch(apiUrl, {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  });

  // レスポンス（JSON配列）をパース
  var tickets = JSON.parse(response.getContentText());

  // 出力先シート（openTicket）を取得・新規作成・クリア
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('openTicket');

  // シートがなければ新規作成、既存シートあればデータクリア
  if (!sheet) {
    sheet = ss.insertSheet('openTicket');
  } else {
    sheet.clear();
  }

  // ヘッダー行を追加
  sheet.appendRow(['ID', 'タイトル', 'ステータス', '作成日']);

  // チケット一覧をシートに出力
  tickets.forEach(function(ticket) {
    sheet.appendRow([
      ticket.ticket_id,   // チケットID
      ticket.title,       // タイトル
      ticket.status_cd,   // ステータス
      ticket.created_at   // 作成日（ISO8601）
    ]);
  });
}
