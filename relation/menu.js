function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🟩 re:lation') // メニュー名をわかりやすく調整
    .addItem('未対応チケットを取得', 'fetchOpenTickets') // 項目名を具体的に変更
    .addToUi();
}
