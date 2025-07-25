function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  // re:lationメニュー
  ui.createMenu('🟩 re:lation')
    .addItem('openチケット取得', 'fetchOpenTickets')
    .addItem('closedチケット取得', 'fetchClosedTickets')
    .addSeparator()
    .addItem('メッセージボックス一覧取得', 'fetchMessageBoxes')
    .addItem('チケット分類一覧取得', 'fetchCaseCategories')
    .addToUi();

  
  // slack通知メニュー
  ui.createMenu('🔔 Slack通知')
    .addItem('Slack通知テスト', 'testSendSlack')
    .addToUi();
}

