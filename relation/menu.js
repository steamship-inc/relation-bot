function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  // re:lationメニュー
  ui.createMenu('🟩 re:lation')
    .addItem('openチケット取得', 'fetchOpenTickets')
    .addItem('closeチケット取得', 'fetchCloseTickets')
    .addSeparator()
    .addItem('メッセージボックス一覧取得', 'fetchMessageBoxes')
    .addToUi();
}
