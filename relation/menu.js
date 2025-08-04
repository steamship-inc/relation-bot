/**
 * Google Apps Script メニュー定義
 * スプレッドシート起動時のメニュー構成のみを定義
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  // re:lationメニュー（全自治体対応）
  ui.createMenu('🟩 re:lation')
    .addItem('全自治体 openチケット取得', 'fetchAllMunicipalitiesOpenTickets')
    .addSeparator()
    .addItem('メッセージボックス一覧取得', 'fetchMessageBoxes')
    .addItem('チケット分類一覧取得', 'fetchCaseCategories')
    .addToUi();

  // slack通知メニュー
  ui.createMenu('🔔 Slack通知')
    .addItem('手動送信', 'manualSendSlack')
    .addToUi();
    
  // 自治体管理メニュー
  ui.createMenu('🏛️ 自治体管理')
    .addItem('設定シート初期化', 'createMunicipalityConfigSheet')
    .addToUi();
}