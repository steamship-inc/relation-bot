/**
 * 受信箱設定管理
 * 複数自治体のre:lation連携設定を管理する
 * 
 * 関数コールツリー:
 * loadMunicipalityConfigFromSheet() - スプレッドシートから自治体設定読み込み
 * └── parseSlackNotificationFilter() - Slack通知フィルタ解析
 * 
 * このファイルが提供する関数:
 * - loadMunicipalityConfigFromSheet(): 他ファイルから広く使用される設定読み込み関数
 * - parseSlackNotificationFilter(): Slack通知フィルタ解析（内部使用）
 */

/**
 * スプレッドシートから自治体設定を読み込み
 * @param {boolean} includeWithoutSlack Slackチャンネル未設定の自治体も含めるかどうか（デフォルト: false）
 * @return {Object} 受信箱設定オブジェクト（受信箱IDをキーとする）
 */
function loadMunicipalityConfigFromSheet(includeWithoutSlack) {
  if (includeWithoutSlack === undefined) {
    includeWithoutSlack = false;
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName('📮受信箱');
  
  if (!configSheet) {
    // 設定シートがない場合はエラー
    throw new Error('受信箱シートが見つかりません。メニュー「📮受信箱取得」を実行してください。');
  }
  
  var data = configSheet.getDataRange().getValues();
  var headers = data[4]; // 5行目がヘッダー
  var configs = {};
  
  // ヘッダー行をスキップして設定を読み込み（5行目の次から）
  for (var i = 5; i < data.length; i++) {
    var row = data[i];
    if (!row[3]) continue; // 受信箱IDが空の行はスキップ
    
    var messageBoxId = row[3]; // D列: 受信箱IDをキーにする
    var municipalityId = row[0];
    var slackChannel = row[4] || '';
    
    // Slackチャンネル設定のチェック
    if (!slackChannel.trim() && !includeWithoutSlack) {
      // Slack通知用の呼び出しでは未設定の自治体をスキップ（エラーにしない）
      console.log('Slackチャンネル未設定のためスキップ: ' + (row[1] || municipalityId));
      continue;
    }
    
    configs[messageBoxId] = {
      municipalityId: municipalityId,  // 自治体IDも保持
      name: row[1] || '',
      prefecture: row[2] || '',
      messageBoxId: messageBoxId,
      slackChannel: slackChannel,
      // Slack通知テンプレート
      slackTemplate: row[5] || '',
      // Slack通知フィルタ条件（自治体固有設定）
      slackNotificationFilter: parseSlackNotificationFilter(row[6])
    };
  }
  
  console.log('📮受信箱シート読込完了(' + Object.keys(configs).length + '件)');
  
  return configs;
}

/**
 * Slack通知フィルタ条件JSON文字列をパース
 * @param {string} jsonString JSON文字列
 * @return {Object} Slack通知フィルタ条件オブジェクト
 */
function parseSlackNotificationFilter(jsonString) {
  if (!jsonString) {
    // デフォルトはフィルタなし（全チケット通知）
    return null;
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Slack通知フィルタ条件の解析に失敗しました: ' + error.toString());
    // エラー時はフィルタなし
    return null;
  }
}





