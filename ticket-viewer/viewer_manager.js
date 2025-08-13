/**
 * チケット詳細ページ管理モジュール
 * 広いUIでチケット詳細を表示
 */

/**
 * 指定受信箱のチケット一覧を取得
 * @param {string} messageBoxId 受信箱ID
 * @return {Array} チケット一覧
 */
function fetchTicketList(messageBoxId) {
  try {
    // APIキーを取得
    var apiKey = getRelationApiKey();
    
    // チケット検索APIを呼び出し
    var apiUrl = getRelationEndpoint('tickets_search', { messageBoxId: messageBoxId });
    var payload = {
      status_cds: DEFAULT_SEARCH_CONDITIONS.status_cds,
      per_page: DEFAULT_SEARCH_CONDITIONS.per_page, // デフォルト値を使用
      page: DEFAULT_SEARCH_CONDITIONS.page
    };
    
    console.log('🔍 チケット検索API呼び出し: ' + apiUrl);
    console.log('📋 送信ペイロード: ' + JSON.stringify(payload));
    
    var response = UrlFetchApp.fetch(apiUrl, {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true // エラーレスポンスも取得
    });
    
    // レスポンスステータスをチェック
    if (response.getResponseCode() !== 200) {
      var errorText = response.getContentText();
      console.error('❌ API エラーレスポンス: ' + response.getResponseCode() + ' - ' + errorText);
      throw new Error('API呼び出しエラー (' + response.getResponseCode() + '): ' + errorText);
    }
    
    var tickets = JSON.parse(response.getContentText());
    
    console.log('🎫 チケット一覧取得成功: ' + tickets.length + '件');
    
    // 必要な情報のみを返す（軽量化）
    return tickets.map(function(ticket) {
      return {
        ticket_id: ticket.ticket_id,
        title: ticket.title,
        status_cd: ticket.status_cd,
        created_at: ticket.created_at,
        last_updated_at: ticket.last_updated_at
      };
    });
    
  } catch (error) {
    console.error('❌ チケット一覧取得失敗: ' + error.message);
    throw new Error('チケット一覧の取得に失敗しました: ' + error.message);
  }
}

/**
 * チケット詳細ページを新しいタブで開く
 */
function openTicketDetailPage() {
  try {
    // HTMLファイルからページを作成
    var htmlOutput = HtmlService.createHtmlOutputFromFile('ticket-viewer/viewer_page')
      .setTitle('🎫 チケット詳細 - re:lation連携')
      .setWidth(1200)
      .setHeight(800);
    
    // 新しいタブで開く
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'チケット詳細');
    
    console.log('🎫 チケット詳細ページ表示');
    
  } catch (error) {
    console.error('❌ チケット詳細ページ表示失敗: ' + error.message);
    SpreadsheetApp.getUi().alert('エラー', 'チケット詳細ページの表示に失敗しました。\n\n' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * ボタンクリック時に呼び出される関数
 * チケット詳細ページを表示
 */
function showTicketDetailPageFromButton() {
  openTicketDetailPage();
}
