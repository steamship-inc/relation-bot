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
  sheet.appendRow(['ID', 'タイトル', 'ステータス', '作成日', '更新日', 'チケット分類ID', 'ラベルID', '保留理由ID']);

  // チケット一覧をシートに出力（タイトルにリンクを追加）
  tickets.forEach(function(ticket, index) {
    var rowIndex = index + 2; // ヘッダー行の次から開始（1ベース）
    
    // 基本データを追加
    sheet.appendRow([
      ticket.ticket_id,           // チケットID
      ticket.title,               // タイトル（後でリッチテキストに変換）
      ticket.status_cd,           // ステータス
      ticket.created_at,          // 作成日（ISO8601）
      ticket.last_updated_at,     // 更新日（ISO8601）
      ticket.case_category_ids ? ticket.case_category_ids.join(', ') : '', // チケット分類ID（配列を文字列に変換）
      ticket.label_ids ? ticket.label_ids.join(', ') : '',                 // ラベルID（配列を文字列に変換）
      ticket.pending_reason_id || ''  // 保留理由ID
    ]);
    
    // チケットURLを生成（正しいre:lationのURL形式）
    var ticketUrl = 'https://' + subdomain + '.relationapp.jp/tickets/#/' + messageBoxId + '/tickets/open/p1/' + ticket.ticket_id + '?order=desc&order_by';
    
    // タイトル列（B列）にリッチテキストでリンクを設定
    var richText = SpreadsheetApp.newRichTextValue()
      .setText(ticket.title)
      .setLinkUrl(ticketUrl)
      .build();
    
    sheet.getRange(rowIndex, 2).setRichTextValue(richText);
  });
}

// re:lation APIから完了チケット一覧を取得し、closedTicketシートに出力する
function fetchClosedTickets() {
  var subdomain = 'steamship';
  var messageBoxId = '629';

  // スクリプトプロパティからAPIキーを取得
  var apiKey = PropertiesService.getScriptProperties().getProperty('RELATION_API_KEY');

  // チケット検索APIのエンドポイント
  var apiUrl = 'https://' + subdomain + '.relationapp.jp/api/v2/' + messageBoxId + '/tickets/search';

  // 検索条件（完了のみ、最大50件、1ページ目）
  var payload = {
    status_cds: ["closed"], // チケットステータス: 完了（closedに変更）
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

  // 出力先シート（closeTicket）を取得・新規作成・クリア
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('closeTicket');

  // シートがなければ新規作成、既存シートあればデータクリア
  if (!sheet) {
    sheet = ss.insertSheet('closeTicket');
  } else {
    sheet.clear();
  }

  // ヘッダー行を追加
  sheet.appendRow(['ID', 'タイトル', 'ステータス', '作成日']);

  // チケット一覧をシートに出力（タイトルにリンクを追加）
  tickets.forEach(function(ticket, index) {
    var rowIndex = index + 2; // ヘッダー行の次から開始（1ベース）
    
    // 基本データを追加
    sheet.appendRow([
      ticket.ticket_id,   // チケットID
      ticket.title,       // タイトル（後でリッチテキストに変換）
      ticket.status_cd,   // ステータス
      ticket.created_at   // 作成日（ISO8601）
    ]);
    
    // チケットURLを生成（正しいre:lationのURL形式 - closeチケット用）
    var ticketUrl = 'https://' + subdomain + '.relationapp.jp/tickets/#/' + messageBoxId + '/tickets/closed/p1/' + ticket.ticket_id + '?order=desc&order_by';
    
    // タイトル列（B列）にリッチテキストでリンクを設定
    var richText = SpreadsheetApp.newRichTextValue()
      .setText(ticket.title)
      .setLinkUrl(ticketUrl)
      .build();
    
    sheet.getRange(rowIndex, 2).setRichTextValue(richText);
  });
}
