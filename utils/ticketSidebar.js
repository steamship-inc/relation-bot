/**
 * チケット詳細サイドバー関連機能
 */

/**
 * チケット詳細を取得する
 * @param {number} messageBoxId メッセージボックスID
 * @param {number} ticketId チケットID
 * @returns {Object} チケット詳細
 */
function fetchTicketDetail(messageBoxId, ticketId) {
  var result = fetchTicketDetailData(messageBoxId, ticketId);
  
  if (!result.success) {
    throw new Error('チケット詳細の取得に失敗しました: ' + result.error);
  }
  
  return result.data;
}

/**
 * チケット詳細サイドバーボタンを作成
 * @param {Sheet} sheet 対象シート
 */
function createTicketDetailButton(sheet) {
  try {
    // スクリプトエディタでHTMLサービスを使用してサイドバーボタンを作成
    var html = HtmlService.createHtmlOutputFromFile('ticket_detail_sidebar')
      .setTitle('チケット詳細')
      .setWidth(400);
    
    // 現在のスプレッドシートにサイドバーを設定（表示はしない）
    SpreadsheetApp.getUi().showSidebar(html);
    
    // サイドバーを一旦非表示にする（ボタンクリック時に表示するため）
    html.close();
    
  } catch (error) {
    console.error('チケット詳細サイドバーボタン作成エラー:', error);
  }
}

/**
 * ボタンからチケット詳細サイドバーを表示
 */
function showTicketDetailSidebarFromButton() {
  showTicketDetailSidebar();
}