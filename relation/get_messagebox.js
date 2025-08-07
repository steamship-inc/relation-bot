// re:lation APIからメッセージボックス一覧を取得し、自治体設定シートを更新する
function fetchMessageBoxes() {
  // スクリプトプロパティからAPIキーを取得
  var apiKey = getRelationApiKey();

  // メッセージボックス一覧APIのエンドポイント
  var apiUrl = buildMessageBoxesUrl();

  // APIリクエスト（GET）
  var response = UrlFetchApp.fetch(apiUrl, {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    }
  });

  // レスポンス（JSON配列）をパース
  var messageBoxes = JSON.parse(response.getContentText());

  // 🏛️自治体設定シートを取得・更新
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName('🏛️自治体設定') || ss.getSheetByName('自治体設定');

  if (!configSheet) {
    // 設定シートがない場合は作成
    console.log('自治体設定シートが見つかりません。新規作成します。');
    createMunicipalityConfigSheet();
    configSheet = ss.getSheetByName('🏛️自治体設定');
  }
  
  // 対象シートをアクティブにする
  ss.setActiveSheet(configSheet);

  var data = configSheet.getDataRange().getValues();
  var headers = data[0];
  
  // ヘッダー行の確認（必要に応じて修正）
  if (headers.length < 4 || headers[1] !== '自治体名' || headers[3] !== '受信箱ID') {
    console.log('自治体設定シートのヘッダーを確認・修正します。');
    var correctHeaders = [
      '自治体ID',
      '自治体名', 
      '都道府県',
      '受信箱ID',
      'Slackチャンネル',
      'Slack通知テンプレート(JSON)',
      'Slack通知フィルタ(JSON)'
    ];
    configSheet.getRange(1, 1, 1, correctHeaders.length).setValues([correctHeaders]);
  }

  // 既存データの行数を確認
  var existingRowCount = data.length;
  
  // コード表からのマッピング用データを事前に読み込み
  var codeTableMap = loadCodeTableMap();
  
  // メッセージボックス一覧を自治体設定シートに追加・更新
  messageBoxes.forEach(function(messageBox, index) {
    var rowIndex = index + 2; // ヘッダー行の次から開始（1ベース）
    
    // 既存行の範囲を超える場合は新しい行を追加
    if (rowIndex > existingRowCount) {
      configSheet.appendRow(['', '', '', '', '', '', '']);
    }
    
    // 自治体名からコード表で都道府県名と団体コードを検索
    var municipalityName = messageBox.name;
    var codeInfo = findMunicipalityInCodeTable(municipalityName, codeTableMap);
    
    // A列（自治体ID/団体コード）を設定
    if (codeInfo.code) {
      // コード表で見つかった場合は団体コードを設定
      configSheet.getRange(rowIndex, 1).setValue(codeInfo.code);
    } else {
      // コード表で見つからない場合は空にする
      configSheet.getRange(rowIndex, 1).setValue('');
      console.log('警告: ' + municipalityName + ' のコードが見つからないため、A列を空にしました');
    }
    
    // B列（自治体名）を更新
    configSheet.getRange(rowIndex, 2).setValue(municipalityName);
    
    // C列（都道府県名）を設定
    if (codeInfo.prefecture) {
      configSheet.getRange(rowIndex, 3).setValue(codeInfo.prefecture);
    }
    
    // D列（受信箱ID）を更新
    configSheet.getRange(rowIndex, 4).setValue(messageBox.message_box_id);
    
    // メッセージボックスURLを生成して自治体名列（B列）にリンクを設定
    var messageBoxUrl = getRelationBaseUrl() + '/tickets/#/' + messageBox.message_box_id + '/tickets/open/p1';
    var richText = SpreadsheetApp.newRichTextValue()
      .setText(municipalityName)
      .setLinkUrl(messageBoxUrl)
      .build();
    
    configSheet.getRange(rowIndex, 2).setRichTextValue(richText);
    
    // ログ出力
    if (codeInfo.code && codeInfo.prefecture) {
      console.log('✓ ' + municipalityName + ' -> コード: ' + codeInfo.code + ', 都道府県: ' + codeInfo.prefecture);
    } else {
      console.log('⚠ ' + municipalityName + ' -> コード表で見つかりませんでした');
    }
  });

  // 取得件数をログ出力
  console.log('自治体設定シート ' + messageBoxes.length + ' 件を更新しました');
  
  // 処理完了をUIで通知
  var message = 'メッセージボックス一覧取得が完了しました。\n\n' +
                '- メッセージボックス取得: ' + messageBoxes.length + ' 件\n' +
                '- 自治体設定シートを更新\n' +
                '- コード表から団体コード・都道府県名を設定';
  
  var ui = SpreadsheetApp.getUi();
  ui.alert('取得完了', message, ui.ButtonSet.OK);
}

/**
 * コード表からマッピング用データを読み込み
 * @return {Array} コード表のデータ配列
 */
function loadCodeTableMap() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var codeSheet = ss.getSheetByName('コード表');
    
    if (!codeSheet) {
      console.log('コード表シートが見つかりません');
      return [];
    }
    
    var codeData = codeSheet.getDataRange().getValues();
    if (codeData.length <= 1) {
      console.log('コード表にデータがありません');
      return [];
    }
    
    console.log('コード表から ' + (codeData.length - 1) + ' 件のデータを読み込みました');
    return codeData;
    
  } catch (error) {
    console.error('コード表読み込みエラー: ' + error.toString());
    return [];
  }
}

/**
 * 自治体名をキーにコード表から団体コードと都道府県名を検索
 * 処理の流れ：自治体名→都道府県名（コード表より）→自治体コード（コード表より）
 * @param {string} municipalityName 自治体名
 * @param {Array} codeTableMap コード表データ
 * @return {Object} {code: 団体コード, prefecture: 都道府県名}
 */
function findMunicipalityInCodeTable(municipalityName, codeTableMap) {
  if (!codeTableMap || codeTableMap.length <= 1) {
    return {code: null, prefecture: null};
  }
  
  console.log('検索開始: ' + municipalityName);
  
  // ステップ1: 自治体名から都道府県名を取得
  var prefecture = null;
  
  // まず、自治体名で完全一致検索して都道府県名を取得
  for (var i = 1; i < codeTableMap.length; i++) {
    var row = codeTableMap[i];
    var rowMunicipalityName = row[2]; // C列: 市区町村名
    
    if (rowMunicipalityName === municipalityName) {
      prefecture = row[1]; // B列: 都道府県名
      console.log('ステップ1完了（完全一致）: ' + municipalityName + ' -> ' + prefecture);
      break;
    }
  }
  
  // 完全一致しない場合、部分一致で都道府県名を検索
  if (!prefecture) {
    for (var i = 1; i < codeTableMap.length; i++) {
      var row = codeTableMap[i];
      var rowMunicipalityName = row[2]; // C列: 市区町村名
      
      // 自治体名が部分的に含まれているかチェック
      if (rowMunicipalityName && municipalityName && 
          (rowMunicipalityName.includes(municipalityName) || municipalityName.includes(rowMunicipalityName))) {
        prefecture = row[1]; // B列: 都道府県名
        console.log('ステップ1完了（部分一致）: ' + municipalityName + ' -> ' + prefecture);
        break;
      }
    }
  }
  
  // 都道府県名が見つからない場合
  if (!prefecture) {
    console.log('ステップ1失敗: ' + municipalityName + ' の都道府県名が見つかりませんでした');
    return {code: null, prefecture: null};
  }
  
  // ステップ2: 自治体名と都道府県名の両方をキーに団体コードを取得
  var municipalityCode = null;
  
  for (var i = 1; i < codeTableMap.length; i++) {
    var row = codeTableMap[i];
    var rowMunicipalityName = row[2]; // C列: 市区町村名
    var rowPrefecture = row[1]; // B列: 都道府県名
    
    // 自治体名と都道府県名の両方が一致するかチェック
    if (rowMunicipalityName === municipalityName && rowPrefecture === prefecture) {
      municipalityCode = row[0]; // A列: 団体コード
      console.log('ステップ2完了（完全一致）: ' + municipalityName + ' + ' + prefecture + ' -> ' + municipalityCode);
      break;
    }
  }
  
  // 完全一致しない場合、自治体名の部分一致で団体コードを検索
  if (!municipalityCode) {
    for (var i = 1; i < codeTableMap.length; i++) {
      var row = codeTableMap[i];
      var rowMunicipalityName = row[2]; // C列: 市区町村名
      var rowPrefecture = row[1]; // B列: 都道府県名
      
      // 都道府県が一致し、自治体名が部分的に含まれているかチェック
      if (rowPrefecture === prefecture && rowMunicipalityName && municipalityName && 
          (rowMunicipalityName.includes(municipalityName) || municipalityName.includes(rowMunicipalityName))) {
        municipalityCode = row[0]; // A列: 団体コード
        console.log('ステップ2完了（部分一致）: ' + municipalityName + ' + ' + prefecture + ' -> ' + municipalityCode);
        break;
      }
    }
  }
  
  // 団体コードが見つからない場合
  if (!municipalityCode) {
    console.log('ステップ2失敗: ' + municipalityName + ' + ' + prefecture + ' の団体コードが見つかりませんでした');
    return {code: null, prefecture: prefecture}; // 都道府県名は返す
  }
  
  console.log('検索完了: ' + municipalityName + ' -> コード: ' + municipalityCode + ', 都道府県: ' + prefecture);
  return {code: municipalityCode, prefecture: prefecture};
}
