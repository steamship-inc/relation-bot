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
    .addItem('📮 受信箱取得', 'fetchMessageBoxes')
    .addItem('🗂️ チケット分類取得', 'fetchCaseCategories')
    .addItem('🏷️ ラベル取得', 'fetchLabels')
    .addSeparator()
    .addItem('🔄 全データ更新（順次実行）', 'runDataUpdateBatch')
    .addToUi();

   ui.createMenu('🔔 Slack')
    .addItem('📤 Slack手動送信', 'manualSendSlack')
    .addSeparator()
    .addItem('🔧 Slackフィルタ設定', 'showFilterConfigDialog')
    .addSeparator()
    .addToUi();

 ui.createMenu('🔍 tool')
    .addItem('📋 チケット詳細確認', 'openTicketDetailPage')
    .addToUi();
}

/**
 * 全データ更新のバッチ処理（順次実行）
 * 受信箱 → チケット分類 → ラベル → 未対応チケット の順で実行
 */
function runDataUpdateBatch() {
  var ui = SpreadsheetApp.getUi();
  
  // 確認ダイアログ
  var response = ui.alert('全データ更新', 
    '以下の処理を順次実行します：\n\n' +
    '1. 🗂️ チケット分類取得\n' +
    '2. 🏷️ ラベル取得\n' +
    '3. 🎫 未対応チケット取得\n\n' +
    '実行には数分かかる場合があります。実行しますか？',
    ui.ButtonSet.YES_NO);
 
  // ユーザーが「いいえ」を選択した場合は処理を中止
  if (response !== ui.Button.YES) {
    return;
  }
  
  try {
    console.log('=== 全データ更新バッチ開始 ===');
    var startTime = new Date();
    
    
    // 1. チケット分類取得
    console.log('1/3: 🗂️ チケット分類取得 開始');
    fetchCaseCategories();
    console.log('1/3: 🗂️ チケット分類取得 完了');
    
    // 2. ラベル取得
    console.log('2/3: 🏷️ ラベル取得 開始');
    fetchLabels();
    console.log('2/3: 🏷️ ラベル取得 完了');
    
    // 3. 未対応チケット取得
    console.log('3/3: 🎫 未対応チケット取得 開始');
    fetchOpenTickets();
    console.log('3/3: 🎫 未対応チケット取得 完了');
    
    var endTime = new Date();
    var duration = Math.round((endTime - startTime) / 1000);
    
    console.log('=== 全データ更新バッチ完了 ===');
    console.log('実行時間: ' + duration + '秒');
    
    ui.alert('完了', 
      '全データ更新が完了しました！\n\n' +
      '実行時間: ' + duration + '秒\n\n' +
      '詳細はコンソールログを確認してください。',
      ui.ButtonSet.OK);
      
  } catch (error) {
    console.error('全データ更新バッチエラー: ' + error.toString());
    ui.alert('エラー', 
      '全データ更新中にエラーが発生しました：\n\n' + 
      error.toString() + '\n\n' +
      'ログを確認して個別に実行してください。',
      ui.ButtonSet.OK);
  }
}
