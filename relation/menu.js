/**
 * Google Apps Script メニュー定義
 * スプレッドシート起動時のメニュー構成のみを定義
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  // re:lationメニュー（全自治体対応）
  ui.createMenu('🟩 re:lation')
    .addItem('openチケット取得', 'fetchOpenTickets')
    .addSeparator()
    .addItem('📮受信箱更新', 'fetchMessageBoxes')
    .addItem('🏷️チケット分類取得', 'fetchCaseCategories')
    .addToUi();

  // slack通知メニュー
  ui.createMenu('🔔 Slack通知')
    .addItem('手動送信', 'manualSendSlack')
    .addToUi();
    
  // 自治体管理メニュー
//  ui.createMenu('🏛️ 自治体管理')
//    .addItem('設定シート初期化', 'createMunicipalityConfigSheet')
//    .addToUi();
}