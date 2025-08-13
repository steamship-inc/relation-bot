/**
 * 🎫 チケット関連機能
 * - 未対応チケット取得
 * - チケット詳細表示
 * - チケットデータ処理
 */

/**
 * 全自治体のオープンチケットを取得してシートに統合出力
 * メニューから呼び出される主要機能
 */
function fetchOpenTickets() {
  try {
    console.log('=== 全自治体オープンチケット取得開始 ===');
    
    // オーケストレーターを使用して完全なワークフローを実行
    var summary = executeOpenTicketsFetch({
      enableNotifications: true,
      enableProgressDisplay: true
    });
    
    console.log('=== 全自治体オープンチケット取得完了 ===');
    console.log('処理結果: 成功 ' + summary.successfulMunicipalities + '/' + summary.totalMunicipalities + ' 自治体');
    console.log('取得チケット総数: ' + summary.totalTickets + ' 件');
    console.log('処理時間: ' + summary.duration);
    
    // 結果通知
    var ui = SpreadsheetApp.getUi();
    var message = '処理完了\\n\\n' +
                  '自治体数: ' + summary.totalMunicipalities + '\\n' +
                  'チケット数: ' + summary.totalTickets + '\\n' +
                  '処理時間: ' + summary.duration;
    
    if (summary.errors.length > 0) {
      message += '\\n\\nエラー: ' + summary.errors.length + '件';
    }
    
    ui.alert('チケット取得完了', message, ui.ButtonSet.OK);
    
    return summary;
    
  } catch (error) {
    handleError(error, 'fetchOpenTickets', 
      'チケット取得処理でエラーが発生しました。\\n\\n' +
      'エラー詳細: ' + error.toString() + '\\n\\n' +
      '以下を確認してください:\\n' +
      '1. ネットワーク接続\\n' +
      '2. APIキーの設定\\n' +
      '3. 受信箱シートの設定'
    );
    throw error;
  }
}

/**
 * サイドバーで詳細表示
 * メニューから呼び出される機能
 */
function showTicketDetailSidebar() {
  try {
    var html = HtmlService.createHtmlOutputFromFile('relation/ticket_detail_sidebar')
        .setTitle('チケット詳細');
    SpreadsheetApp.getUi().showSidebar(html);
  } catch (error) {
    handleError(error, 'showTicketDetailSidebar', 'サイドバー表示でエラーが発生しました。');
  }
}
