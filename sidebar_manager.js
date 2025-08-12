/**
 * チケット詳細サイドバー管理モジュール
 * リアルタイムセル選択追跡とサイドバー制御を担当
 */

// グローバル変数でサイドバーの状態を管理
var lastSelectedRow = null;
var lastSelectedSheet = null;

/**
 * サイドバーを表示して初期化
 */
function showTicketDetailSidebar() {
  try {
    // HTMLファイルからサイドバーを作成
    var htmlOutput = HtmlService.createHtmlOutputFromFile('ticket_detail_sidebar')
      .setTitle('🎫 チケット詳細')
      .setWidth(350);
    
    SpreadsheetApp.getUi().showSidebar(htmlOutput);
    
    console.log('チケット詳細サイドバーを表示しました');
    
    // 初期状態を設定
    resetSidebarState();
    
  } catch (error) {
    console.error('サイドバー表示エラー: ' + error.toString());
    SpreadsheetApp.getUi().alert('エラー', 'サイドバーの表示に失敗しました。\n\n' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * サイドバー用のチケットデータを取得（ポーリング用関数）
 * サイドバーのJavaScriptから定期的に呼び出される
 * @return {Object} 表示用データオブジェクト
 */
function getSidebarTicketData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var selection = sheet.getActiveRange();
    
    var currentRow = selection.getRow();
    var currentSheetName = sheet.getName();
    
    // 🎫未対応チケットシート以外では空状態を返す
    if (currentSheetName !== '🎫未対応チケット') {
      lastSelectedRow = null;
      lastSelectedSheet = null;
      return { type: 'empty' };
    }
    
    // ヘッダー行より上の場合は空状態を返す
    if (currentRow < 6) {
      lastSelectedRow = null;
      lastSelectedSheet = currentSheetName;
      return { type: 'empty' };
    }
    
    // 選択が変わっていない場合は何も返さない（パフォーマンス向上）
    if (lastSelectedRow === currentRow && lastSelectedSheet === currentSheetName) {
      return { type: 'no_change' };
    }
    
    // 選択状態を更新
    lastSelectedRow = currentRow;
    lastSelectedSheet = currentSheetName;
    
    // チケットデータを取得
    var messageBoxId = sheet.getRange(currentRow, 1).getValue();
    var municipalityName = sheet.getRange(currentRow, 2).getValue();
    var ticketId = sheet.getRange(currentRow, 3).getValue();
    
    if (!messageBoxId || !ticketId) {
      return { type: 'empty' };
    }
    
    // チケット詳細を取得
    var ticketDetail = fetchTicketDetailWithCaching(messageBoxId.toString(), ticketId.toString());
    
    // チケット分類とラベルの名前を取得
    var caseCategoriesMap = getCaseCategoriesMap(messageBoxId);
    var labelsMap = getLabelsMap(messageBoxId);
    
    // 分類名とラベル名を追加
    if (ticketDetail.case_category_ids && ticketDetail.case_category_ids.length > 0) {
      ticketDetail.case_category_names = getCategoryNames(ticketDetail.case_category_ids, caseCategoriesMap);
    }
    
    if (ticketDetail.label_ids && ticketDetail.label_ids.length > 0) {
      ticketDetail.label_names = getLabelNames(ticketDetail.label_ids, labelsMap);
    }
    
    return {
      type: 'detail',
      ticketDetail: ticketDetail,
      municipalityName: municipalityName.toString(),
      messageBoxId: messageBoxId.toString()
    };
    
  } catch (error) {
    console.error('サイドバーデータ取得エラー: ' + error.toString());
    return {
      type: 'error',
      message: 'チケット詳細の取得に失敗しました: ' + error.toString()
    };
  }
}

/**
 * キャッシュ機能付きのチケット詳細取得
 * 同じチケットの場合はキャッシュを使用してパフォーマンスを向上
 * @param {string} messageBoxId 受信箱ID
 * @param {string} ticketId チケットID
 * @return {Object} チケット詳細オブジェクト
 */
function fetchTicketDetailWithCaching(messageBoxId, ticketId) {
  // シンプルなキャッシュキー
  var cacheKey = messageBoxId + '_' + ticketId;
  var cache = CacheService.getScriptCache();
  
  // キャッシュから取得を試行（5分間有効）
  var cachedData = cache.get(cacheKey);
  if (cachedData) {
    try {
      console.log('キャッシュからチケット詳細を取得: ' + ticketId);
      return JSON.parse(cachedData);
    } catch (error) {
      console.warn('キャッシュデータの解析に失敗: ' + error.toString());
    }
  }
  
  // キャッシュにない場合はAPIから取得
  console.log('APIからチケット詳細を取得: ' + ticketId);
  var ticketDetail = fetchTicketDetail(messageBoxId, ticketId);
  
  // キャッシュに保存（5分間）
  try {
    cache.put(cacheKey, JSON.stringify(ticketDetail), 300);
  } catch (error) {
    console.warn('キャッシュへの保存に失敗: ' + error.toString());
  }
  
  return ticketDetail;
}

/**
 * サイドバーの状態をリセット
 */
function resetSidebarState() {
  lastSelectedRow = null;
  lastSelectedSheet = null;
}

/**
 * セル選択変更時に呼び出される関数（互換性のため残す）
 * Google Apps Scriptのトリガーから自動的に呼び出される
 */
function onSelectionChange(e) {
  // ポーリングベースの実装では不要だが、将来的な拡張のため残す
  console.log('セル選択が変更されました');
}

/**
 * 手動でサイドバーの内容を更新（デバッグ用）
 */
function refreshSidebarContent() {
  resetSidebarState();
  console.log('サイドバー状態をリセットしました');
}

/**
 * チケットシートが開かれた時にサイドバーを自動表示
 */
function onTicketSheetOpen() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  
  if (sheet.getName() === '🎫未対応チケット') {
    showTicketDetailSidebar();
  }
}

/**
 * サイドバーを閉じる（プログラム制御ではできないため、メッセージ表示）
 */
function closeTicketDetailSidebar() {
  SpreadsheetApp.getUi().alert('サイドバーを閉じる', 'サイドバーの右上の「×」ボタンで閉じることができます。', SpreadsheetApp.getUi().ButtonSet.OK);
}
