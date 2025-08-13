/**
 * 受信箱設定管理
 * 複数自治体のre:lation連携設定を管理する
 * 
 * 関数コールツリー:
 * loadMunicipalityConfigFromSheet() - スプレッドシートから自治体設定読み込み
 * ├── parseSlackNotificationFilter() [slack/municipality-slack-config.js] - Slack通知フィルタ解析
 * 
 * getMunicipalityDataFromSheet() - 既存の自治体データ取得
 * └── findColumnIndex() - 列名からインデックス検索
 * 
 * 外部ファイルからの依存:
 * - slack/municipality-slack-config.js: parseSlackNotificationFilter()
 * 
 * このファイルが提供する関数:
 * - loadMunicipalityConfigFromSheet(): 他ファイルから広く使用される設定読み込み関数
 * - getMunicipalityDataFromSheet(): 自治体データの取得（内部使用）
 * - findColumnIndex(): 列名検索ユーティリティ（内部使用）
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
  
  console.log('スプレッドシートから ' + Object.keys(configs).length + ' 件の受信箱設定を読み込みました');
  
  return configs;
}

/**
 * 既存の自治体データシートから初期データを取得
 * @param {string} defaultSlackTemplate デフォルトSlackテンプレート
 * @param {string} defaultSlackFilter デフォルトSlackフィルタ
 * @return {Array} 自治体データの配列
 */
function getMunicipalityDataFromSheet(defaultSlackTemplate, defaultSlackFilter) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 可能性のある自治体データシート名を順に試す
    var possibleSheetNames = [
      '自治体マスタ',
      '自治体一覧', 
      '自治体データ',
      'municipalities',
      'master'
    ];
    
    var sourceSheet = null;
    for (var i = 0; i < possibleSheetNames.length; i++) {
      sourceSheet = ss.getSheetByName(possibleSheetNames[i]);
      if (sourceSheet) {
        console.log('自治体データシートを発見: ' + possibleSheetNames[i]);
        break;
      }
    }
    
    if (!sourceSheet) {
      throw new Error('自治体データシートが見つかりません。メニュー「📮受信箱取得」を実行して自治体データを取得してください。');
    }
    
    var data = sourceSheet.getDataRange().getValues();
    if (data.length <= 1) {
      throw new Error('自治体データシートにデータがありません。メニュー「📮受信箱取得」を実行して自治体データを取得してください。');
    }
    
    var headers = data[0];
    var municipalityData = [];
    
    // ヘッダーから列のインデックスを特定
    var idIndex = findColumnIndex(headers, ['自治体ID', 'id', 'municipality_id']);
    var nameIndex = findColumnIndex(headers, ['自治体名', 'name', 'municipality_name']);
    var prefectureIndex = findColumnIndex(headers, ['都道府県', 'prefecture', '県']);
    var messageBoxIdIndex = findColumnIndex(headers, ['受信箱ID', 'メッセージボックスID', 'messagebox_id', 'mb_id']);
    var slackChannelIndex = findColumnIndex(headers, ['Slackチャンネル', 'slack_channel', 'channel']);
    
    console.log('列マッピング: ID=' + idIndex + ', 名前=' + nameIndex + ', 県=' + prefectureIndex + ', MB=' + messageBoxIdIndex + ', Slack=' + slackChannelIndex);
    
    // データ行を処理
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      
      // 必須項目がある行のみ処理
      if (row[idIndex] && row[nameIndex] && row[messageBoxIdIndex]) {
        var slackChannel = row[slackChannelIndex] || '@U06RYE77HB8'; // デフォルトは個人DM
        
        municipalityData.push([
          row[idIndex],                    // 自治体ID
          row[nameIndex],                  // 自治体名
          row[prefectureIndex] || '',      // 都道府県
          row[messageBoxIdIndex],          // 受信箱ID
          slackChannel,                    // Slackチャンネル
          defaultSlackTemplate,            // Slack通知テンプレート
          defaultSlackFilter               // Slack通知フィルタ
        ]);
      }
    }
    
    if (municipalityData.length === 0) {
      throw new Error('有効な自治体データがありません。自治体データシートの形式を確認するか、メニュー「📮受信箱取得」を実行してください。');
    }
    
    console.log('自治体データシートから ' + municipalityData.length + '件のデータを読み込みました');
    return municipalityData;
    
  } catch (error) {
    console.error('自治体データシート読み込みエラー: ' + error.toString());
    throw error; // エラーを再投げして呼び出し元で適切に処理
  }
}

/**
 * 列名からインデックスを検索
 * @param {Array} headers ヘッダー行
 * @param {Array} possibleNames 可能な列名の配列
 * @return {number} 列のインデックス（見つからない場合は-1）
 */
function findColumnIndex(headers, possibleNames) {
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i].toString().toLowerCase();
    for (var j = 0; j < possibleNames.length; j++) {
      if (header.includes(possibleNames[j].toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}





