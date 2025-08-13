/**
 * 🏷️ チケット分類・ラベル管理機能
 * - チケット分類取得
 * - ラベル取得
 * - 分類データ処理
 */

/**
 * 全自治体のチケット分類一覧を取得・更新
 * メニューから呼び出される機能
 */
function fetchCaseCategories() {
  try {
    console.log('=== 全自治体チケット分類取得開始 ===');
    
    var result = MasterDataService.fetchAllCaseCategories();
    
    console.log('=== 全自治体チケット分類取得完了 ===');
    console.log('処理結果: 成功 ' + result.successCount + '/' + result.totalCount + ' 自治体');
    console.log('取得分類総数: ' + result.dataCount + ' 件');
    
    // 結果通知
    NotificationService.showCompletionAlert('全自治体チケット分類取得完了', result);
    
    return result;
    
  } catch (error) {
    handleError(error, 'fetchCaseCategories', 
      'チケット分類取得処理でエラーが発生しました。\\n\\n' +
      'エラー詳細: ' + error.toString()
    );
    throw error;
  }
}

/**
 * 全自治体のラベル一覧を取得・更新
 * メニューから呼び出される機能
 */
function fetchLabels() {
  try {
    console.log('=== 全自治体ラベル取得開始 ===');
    
    var result = MasterDataService.fetchAllLabels();
    
    console.log('=== 全自治体ラベル取得完了 ===');
    console.log('処理結果: 成功 ' + result.successCount + '/' + result.totalCount + ' 自治体');
    console.log('取得ラベル総数: ' + result.dataCount + ' 件');
    
    // 結果通知
    NotificationService.showCompletionAlert('全自治体ラベル取得完了', result);
    
    return result;
    
  } catch (error) {
    handleError(error, 'fetchLabels', 
      'ラベル取得処理でエラーが発生しました。\\n\\n' +
      'エラー詳細: ' + error.toString()
    );
    throw error;
  }
}
