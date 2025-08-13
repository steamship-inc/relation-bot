/**
 * fetchTickets.js - レガシー版（互換性維持）
 * 新しいアーキテクチャへの移行により、この ファイルは段階的に廃止予定
 * 現在は下位互換性のためにのみ保持
 */

/**
 * 既存のメニューシステムとの互換性を保つメイン関数
 * 内部では新しいオーケストレーターを呼び出し
 * @deprecated 新しいコードではfetchOpenTickets()を使用してください
 */
function fetchOpenTickets() {
  try {
    console.log('=== fetchOpenTickets (レガシー版) ===');
    console.log('注意: この関数は廃止予定です。relation/controllers/mainController.js のfetchOpenTickets()を使用してください。');
    
    // 新しいオーケストレーターを呼び出し
    var summary = executeOpenTicketsFetch({
      enableNotifications: true,
      enableProgressDisplay: true,
      legacyMode: true
    });
    
    // レガシー形式の戻り値に変換
    return {
      success: true,
      processedCount: summary.totalMunicipalities,
      ticketCount: summary.totalTickets,
      duration: summary.duration,
      errors: summary.errors
    };
    
  } catch (error) {
    console.error('fetchOpenTickets (レガシー版) エラー:', error.toString());
    
    // レガシー形式のエラー処理
    Browser.msgBox('エラー',
      'チケット取得処理でエラーが発生しました。\\n\\n' +
      'エラー詳細: ' + error.toString() + '\\n\\n' +
      '以下を確認してください:\\n' +
      '1. ネットワーク接続\\n' +
      '2. APIキーの設定\\n' +
      '3. 受信箱シートの設定',
      Browser.Buttons.OK);
    
    throw error;
  }
}

/**
 * 互換性維持のための古いヘルパー関数群
 * これらの関数は新しいユーティリティに置き換えられました
 */

/**
 * @deprecated utils/apiHelpers.js の safeApiFetch を使用してください
 */
function makeApiRequest(url, options) {
  console.warn('makeApiRequest は廃止予定です。safeApiFetch を使用してください。');
  return safeApiFetch(url, options, 'レガシーAPI呼び出し');
}

/**
 * @deprecated utils/dataProcessors.js の formatTicketsForSpreadsheet を使用してください
 */
function formatTicketData(tickets) {
  console.warn('formatTicketData は廃止予定です。formatTicketsForSpreadsheet を使用してください。');
  return formatTicketsForSpreadsheet(tickets);
}

/**
 * @deprecated utils/slackHelpers.js の sendBasicSlackNotification を使用してください
 */
function sendSlackMessage(message) {
  console.warn('sendSlackMessage は廃止予定です。sendBasicSlackNotification を使用してください。');
  return sendBasicSlackNotification(message);
}

/**
 * 移行ガイダンス関数
 * 開発者向けの移行情報を提供
 */
function showMigrationGuide() {
  var ui = SpreadsheetApp.getUi();
  var message = 'fetchTickets.js 移行ガイド\\n\\n' +
                '新しいアーキテクチャへの移行が完了しました。\\n\\n' +
                '【推奨】\\n' +
                '• relation/controllers/mainController.js の fetchOpenTickets() を使用\\n' +
                '• relation/utils/ticketOrchestrator.js の executeOpenTicketsFetch() を直接呼び出し\\n\\n' +
                '【廃止予定】\\n' +
                '• fetchOpenTickets() (このファイルの関数)\\n' +
                '• 個別のAPIヘルパー関数\\n\\n' +
                '【新しいファイル構成】\\n' +
                '• relation/utils/apiHelpers.js - API関連\\n' +
                '• relation/utils/dataProcessors.js - データ処理\\n' +
                '• slack/slackHelpers.js - Slack通知\\n' +
                '• relation/utils/ticketOrchestrator.js - メイン処理\\n' +
                '• relation/controllers/mainController.js - 統一されたエントリポイント';
  
  ui.alert('移行ガイド', message, ui.ButtonSet.OK);
}

/**
 * レガシーコードの検出と警告
 * 古いコードの使用を検出してログに警告を出力
 */
function detectLegacyUsage() {
  console.warn('=== レガシーコード使用の警告 ===');
  console.warn('fetchTickets.js の関数が呼び出されました。');
  console.warn('新しいアーキテクチャに移行することを強く推奨します。');
  console.warn('移行方法については showMigrationGuide() を実行してください。');
  console.warn('=====================================');
}

// この ファイルが読み込まれた時に警告を表示
detectLegacyUsage();
