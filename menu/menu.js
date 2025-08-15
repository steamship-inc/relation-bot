/**
 * Google Apps Script メニュー定義
 * スプレッドシート起動時のメニュー構成のみを定義
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  // re:lationメニュー（全自治体対応）
  ui.createMenu('🟩 re:lation')
    .addItem('🎫 未対応チケット取得', 'fetchOpenTickets')
    .addSeparator()
    .addItem('📋 詳細ページで表示', 'openTicketDetailPage')
    .addSeparator()
    .addToUi();

  ui.createMenu('🏛 設定')
    .addItem('📮 受信箱取得', 'fetchMessageBoxes')
    .addItem('🗂️ チケット分類取得', 'fetchCaseCategories')
    .addItem('🏷️ ラベル取得', 'fetchLabels')
    .addToUi();

  ui.createMenu('🔔 Slack')
    .addItem('📤 Slack手動送信', 'manualSendSlack')
    .addSeparator()
    .addItem('🔧 Slackフィルタ設定', 'showFilterConfigDialog')
    .addToUi();
}
