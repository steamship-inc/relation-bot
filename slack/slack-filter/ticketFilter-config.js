/**
 * Slack通知フィルタ設定支援モジュール
 * エンジニア以外でも簡単にフィルタ条件を設定できるヘルパー機能
 */

/**
 * フィルタ設定用UIを表示する関数
 * 📮受信箱シートのG列に設定するJSON文字列を生成
 */
function showFilterConfigDialog() {
  // 全自治体の設定を取得
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    SpreadsheetApp.getUi().alert('エラー', '自治体設定が見つかりません。先に「📮 受信箱取得」を実行してください。', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  // 統合モーダルHTMLダイアログを表示
  showIntegratedModalDialog(configs);
}

/**
 * 統合モーダルHTMLダイアログを表示
 * 自治体選択とフィルター設定を統合したモーダル
 * @param {Object} configs 全自治体設定
 */
function showIntegratedModalDialog(configs) {
  var htmlOutput = HtmlService.createTemplateFromFile('slack/slack-filter/ticketFilter');
  
  // テンプレートにデータを渡す
  htmlOutput.configs = configs;
  
  // HTMLダイアログを表示
  var output = htmlOutput.evaluate()
    .setWidth(800)
    .setHeight(700);
    
  SpreadsheetApp.getUi().showModalDialog(output, 'Slackフィルタ設定');
}

/**
 * HTMLファイルの内容を取得する（Google Apps Script用）
 * @param {string} filename ファイル名
 * @return {string} ファイルの内容
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * フィルタ設定データを取得する（JavaScript側から呼び出し）
 * @param {string} messageBoxId 受信箱ID
 * @return {Object} フィルタ設定に必要なデータ
 */
function getFilterConfigData(messageBoxId) {
  var configs = loadMunicipalityConfigFromSheet(true);
  var config = configs[messageBoxId];
  
  if (!config) {
    throw new Error('選択された自治体の設定が見つかりません: ' + messageBoxId);
  }
  
  // ラベルとチケット分類のデータを取得
  var labelsMap = getLabelsMap(messageBoxId);
  var categoriesMap = getCaseCategoriesMap(messageBoxId);
  
  // 現在の設定を取得
  var currentFilter = config.slackNotificationFilter || {};
  
  return {
    config: config,
    labelsMap: labelsMap,
    categoriesMap: categoriesMap,
    currentFilter: currentFilter
  };
}

/**
 * サーバーサイド: フィルタ設定保存
 * @param {string} messageBoxId 受信箱ID
 * @param {Object} filterConfig フィルタ設定オブジェクト
 */
function saveFilterConfig(messageBoxId, filterConfig) {
  console.log('saveFilterConfig呼び出し - 受信箱ID: ' + messageBoxId);
  console.log('フィルタ設定: ' + JSON.stringify(filterConfig));
  
  try {
    updateFilterConfigInSheet(messageBoxId, filterConfig);
    console.log('フィルタ設定保存成功');
  } catch (error) {
    console.error('フィルタ設定保存エラー: ' + error.toString());
    throw error;
  }
}

/**
 * 📮受信箱シートのフィルタ設定を更新
 * @param {string} messageBoxId 受信箱ID
 * @param {Object} filterConfig フィルタ設定オブジェクト
 */
function updateFilterConfigInSheet(messageBoxId, filterConfig) {
  console.log('updateFilterConfigInSheet開始 - 受信箱ID: ' + messageBoxId + ' (type: ' + typeof messageBoxId + ')');
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName('📮受信箱');
  
  if (!configSheet) {
    throw new Error('📮受信箱シートが見つかりません');
  }
  
  var data = configSheet.getDataRange().getValues();
  console.log('📮受信箱シートの行数: ' + data.length);
  
  // ヘッダー行の確認（5行目）
  if (data.length > 4) {
    console.log('ヘッダー行: ' + JSON.stringify(data[4]));
  }
  
  // 該当する受信箱IDの行を探す
  var found = false;
  for (var i = 5; i < data.length; i++) { // 6行目以降（0ベースで5以降）
    var rowMessageBoxId = data[i][3]; // D列: 受信箱ID
    console.log('行' + (i + 1) + ' の受信箱ID: "' + rowMessageBoxId + '" (type: ' + typeof rowMessageBoxId + ')');
    
    // 文字列と数値の両方で比較
    if (rowMessageBoxId == messageBoxId || 
        rowMessageBoxId === messageBoxId || 
        String(rowMessageBoxId) === String(messageBoxId)) {
      
      console.log('受信箱ID一致: 行' + (i + 1));
      
      // G列（6列目、0ベースで6）にJSON文字列を設定
      var jsonString = Object.keys(filterConfig).length > 0 ? JSON.stringify(filterConfig) : '';
      configSheet.getRange(i + 1, 7).setValue(jsonString);
      
      console.log('フィルタ設定更新完了: ' + messageBoxId + ' -> ' + jsonString);
      found = true;
      return;
    }
  }
  
  if (!found) {
    // デバッグ情報を追加
    var allMessageBoxIds = [];
    for (var j = 5; j < data.length; j++) {
      if (data[j][3]) {
        allMessageBoxIds.push('"' + data[j][3] + '" (' + typeof data[j][3] + ')');
      }
    }
    
    var errorMsg = '受信箱ID ' + messageBoxId + ' が見つかりません。\n' +
                  '利用可能な受信箱ID: ' + allMessageBoxIds.join(', ');
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}
