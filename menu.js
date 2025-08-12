/**
 * Google Apps Script メニュー定義
 * スプレッドシート起動時のメニュー構成のみを定義
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  // re:lationメニュー（全自治体対応）
  ui.createMenu('🟩 re:lation')
    .addItem('🎫 未対応チケット取得', 'fetchOpenTickets')
    .addItem('🪧チケット詳細表示', 'showSelectedTicketDetail')
    .addSeparator()
    .addItem('🔔slack手動送信', 'manualSendSlack')
    .addToUi();

  ui.createMenu('🏛 設定')
    .addItem('📮 受信箱取得', 'fetchMessageBoxes')
    .addItem('🏷 ️チケット分類取得', 'fetchCaseCategories')
    .addItem('🏷️ ラベル取得', 'fetchLabels')
    .addToUi();
}
