/**
 * 📮 受信箱管理機能
 * - 受信箱一覧取得
 * - 受信箱データ処理
 */

/**
 * メッセージボックス一覧を取得・更新
 * メニューから呼び出される機能
 */
function fetchMessageBoxes() {
  try {
    console.log('=== メッセージボックス取得開始 ===');
    
    var result = MessageBoxService.fetchAndUpdateMessageBoxes();
    
    console.log('=== メッセージボックス取得完了 ===');
    console.log('処理結果: 成功 ' + result.successCount + '/' + result.totalCount + ' 件');
    console.log('コード表マッチ数: ' + result.dataCount + ' 件');
    
    // 結果通知
    NotificationService.showCompletionAlert('メッセージボックス取得完了', result);
    
    return result;
    
  } catch (error) {
    handleError(error, 'fetchMessageBoxes', 
      'メッセージボックス取得処理でエラーが発生しました。\\n\\n' +
      'エラー詳細: ' + error.toString()
    );
    throw error;
  }
}
