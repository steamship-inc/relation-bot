/**
 * 受信箱設定管理
 * 複数自治体のre:lation連携設定を管理する
 */

/**
 * 指定された受信箱IDの設定を取得
 * @param {string} messageBoxId 受信箱ID
 * @return {Object} 受信箱設定オブジェクト
 */
function getMunicipalityConfig(messageBoxId) {
  var configs = getAllMunicipalityConfigs();
  
  if (!configs[messageBoxId]) {
    throw new Error('受信箱設定が見つかりません: ' + messageBoxId);
  }
  
  return configs[messageBoxId];
}

/**
 * 全自治体の設定を取得（スプレッドシートから読み込み）
 * @return {Object} 全受信箱設定オブジェクト（受信箱IDをキーとする）
 */
function getAllMunicipalityConfigs() {
  // スプレッドシートから設定を読み込み
  return loadMunicipalityConfigFromSheet();
}

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

/**
 * 受信箱設定シートを初期化（メニューから呼び出される基本機能）
 * @return {Object} 初期設定オブジェクト
 */
function createMunicipalityConfigSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.insertSheet('📮受信箱');
  
  // A1にシートタイトルを設定
  configSheet.getRange('A1').setValue('📮受信箱');
  configSheet.getRange('A1').setFontWeight('bold');
  
  // ヘッダー行を5行目に設定
  var headers = [
    '自治体ID',
    '自治体名', 
    '都道府県',
    '受信箱ID',
    'Slackチャンネル',
    'Slack通知テンプレート(JSON)',
    'Slack通知フィルタ(JSON)'
  ];
  configSheet.getRange(5, 1, 1, headers.length).setValues([headers]);
  
  // デフォルトSlackテンプレート設定
  var defaultSlackTemplate = JSON.stringify({
    headerTemplate: '� *{municipalityName}*\n\n未対応チケット({totalCount}件)\n\n',
    ticketListHeader: '🎫 *未対応チケット一覧:*\n',
    ticketItemTemplate: '• <{ticketUrl}|#{ticketId}> {title}\n  📅 作成: {createdAt}  🔄 更新: {updatedAt}\n  🏷️ 分類: {categoryNames}\n  🔖 ラベル: {labelNames}\n',
    footerMessage: '\n💡 詳細はスプレッドシートをご確認ください'
  });
  
  // デフォルトSlack通知フィルタ設定（全チケット通知）
  var defaultSlackFilter = JSON.stringify({});
  
  // 既存の自治体データシートから初期データを取得
  var initialData = getMunicipalityDataFromSheet(defaultSlackTemplate, defaultSlackFilter);
  
  configSheet.getRange(6, 1, initialData.length, headers.length).setValues(initialData);
  
  // 列幅を調整
  configSheet.setColumnWidth(1, 100); // 自治体ID
  configSheet.setColumnWidth(2, 120); // 自治体名
  configSheet.setColumnWidth(3, 100); // 都道府県
  configSheet.setColumnWidth(4, 150); // 受信箱ID
  configSheet.setColumnWidth(5, 150); // Slackチャンネル
  configSheet.setColumnWidth(6, 500); // Slack通知テンプレートJSON
  configSheet.setColumnWidth(7, 400); // Slack通知フィルタJSON
  
  // ヘッダー行の書式設定
  var headerRange = configSheet.getRange(5, 1, 1, headers.length);
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');
  headerRange.setFontWeight('bold');
  
  console.log('📮受信箱シートを初期化しました');
  
  // 初期設定を返す
  return loadMunicipalityConfigFromSheet();
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
      console.log('自治体データシートが見つかりません。デフォルトデータを使用します。');
      return getDefaultMunicipalityData(defaultSlackTemplate, defaultSlackFilter);
    }
    
    var data = sourceSheet.getDataRange().getValues();
    if (data.length <= 1) {
      console.log('自治体データシートにデータがありません。デフォルトデータを使用します。');
      return getDefaultMunicipalityData(defaultSlackTemplate, defaultSlackFilter);
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
      console.log('有効な自治体データがありません。デフォルトデータを使用します。');
      return getDefaultMunicipalityData(defaultSlackTemplate, defaultSlackFilter);
    }
    
    console.log('自治体データシートから ' + municipalityData.length + '件のデータを読み込みました');
    return municipalityData;
    
  } catch (error) {
    console.error('自治体データシート読み込みエラー: ' + error.toString());
    return getDefaultMunicipalityData(defaultSlackTemplate, defaultSlackFilter);
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

/**
 * デフォルトの自治体データを取得
 * @param {string} defaultSlackTemplate デフォルトSlackテンプレート
 * @param {string} defaultSlackFilter デフォルトSlackフィルタ
 * @return {Array} デフォルト自治体データ
 */
function getDefaultMunicipalityData(defaultSlackTemplate, defaultSlackFilter) {
  return [
    [
      'yamaga',
      '山鹿市',
      '熊本県', 
      '629',
      '@U06RYE77HB8',  // 個人DM（ユーザーID）
      defaultSlackTemplate,
      defaultSlackFilter
    ]
  ];
}





