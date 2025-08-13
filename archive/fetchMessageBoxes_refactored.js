// re:lation APIからメッセージボックス一覧を取得し、受信箱シートを更新する
function fetchMessageBoxes() {
  // APIからメッセージボックス一覧を取得
  var apiKey = getRelationApiKey();
  var apiUrl = buildMessageBoxesUrl();

  var response = UrlFetchApp.fetch(apiUrl, {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    }
  });

  var messageBoxes = JSON.parse(response.getContentText());

  // シートを初期化または取得
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName(getSheetName('MESSAGE_BOXES'));

  if (!configSheet) {
    console.log('受信箱シートが見つかりません。新規作成します。');
    createMunicipalityConfigSheet();
    configSheet = ss.getSheetByName(getSheetName('MESSAGE_BOXES'));
  }
  
  // 対象シートをアクティブにする
  ss.setActiveSheet(configSheet);

  // A1にシートタイトルを設定
  configSheet.getRange('A1').setValue('📮受信箱');
  
  // 進捗表示用のセルを準備
  var progressCell = configSheet.getRange(getConstant('PROGRESS.CELL_POSITION'));
  
  // バッチプロセッサを作成
  var processor = createBatchProcessor({
    batchSize: getConstant('BATCH_SIZE'),
    waitTime: getConstant('RATE_LIMIT_WAIT'),
    progressCell: progressCell,
    progressPrefix: 'メッセージボックス処理'
  });
  
  // ヘッダー行の確認・設定
  ensureCorrectHeaders(configSheet);
  
  // コード表データを事前に読み込み
  var codeTableMap = loadCodeTableMap();
  
  // 各メッセージボックスを処理する関数
  function processMessageBox(messageBox, index) {
    try {
      var municipalityName = messageBox.name;
      var codeInfo = findMunicipalityInCodeTable(municipalityName, codeTableMap);
      
      // 既存データの確認と更新
      var data = configSheet.getDataRange().getValues();
      var rowIndex = findOrCreateRowForMessageBox(configSheet, messageBox.message_box_id, data.length);
      
      // 自治体データを更新
      updateMunicipalityRow(configSheet, rowIndex, messageBox, codeInfo);
      
      console.log('処理完了: ' + municipalityName);
      
      return {
        messageBoxId: messageBox.message_box_id,
        municipalityName: municipalityName,
        codeFound: !!codeInfo.code
      };
      
    } catch (error) {
      console.error('メッセージボックス処理エラー [' + messageBox.message_box_id + ']: ' + error.toString());
      throw error;
    }
  }
  
  // バッチ処理実行
  var processResult = processor.process(messageBoxes, processMessageBox);
  
  // 結果表示
  var ui = SpreadsheetApp.getUi();
  var message = 'メッセージボックス取得完了\\n\\n';
  message += '成功: ' + processResult.successCount + '/' + messageBoxes.length + '件\\n';
  
  var foundCodeCount = processResult.results.filter(function(result) {
    return result.codeFound;
  }).length;
  message += 'コード表マッチ: ' + foundCodeCount + '件\\n';
  
  if (processResult.errors.length > 0) {
    message += 'エラー: ' + processResult.errors.length + '件\\n\\n';
    message += processResult.errors.map(function(err) {
      return err.item.name + ': ' + err.error;
    }).join('\\n');
  }
  
  ui.alert('実行結果', message, ui.ButtonSet.OK);
}

/**
 * ヘッダー行の確認・設定
 */
function ensureCorrectHeaders(configSheet) {
  var data = configSheet.getDataRange().getValues();
  var headers = data.length > 4 ? data[4] : []; // 5行目がヘッダー
  
  // ヘッダー行の確認（必要に応じて修正）
  if (headers.length < 4 || headers[1] !== '自治体名' || headers[3] !== '受信箱ID') {
    console.log('受信箱シートのヘッダーを確認・修正します。');
    var correctHeaders = getHeaders('MESSAGE_BOXES');
    configSheet.getRange(5, 1, 1, correctHeaders.length).setValues([correctHeaders]);
  }
}

/**
 * メッセージボックスIDに対応する行を検索または作成
 */
function findOrCreateRowForMessageBox(configSheet, messageBoxId, dataLength) {
  var data = configSheet.getDataRange().getValues();
  
  // 既存行を検索（受信箱IDで照合）
  for (var i = 5; i < data.length; i++) { // 6行目から開始（5行目はヘッダー）
    if (data[i][getColumnIndex('MESSAGE_BOXES', 'MESSAGE_BOX_ID')] === messageBoxId) {
      return i + 1; // 1ベースの行番号を返す
    }
  }
  
  // 見つからない場合は新しい行を追加
  var newRowIndex = data.length + 1;
  if (newRowIndex > dataLength) {
    configSheet.appendRow(['', '', '', '', '', '', '']);
  }
  
  return newRowIndex;
}

/**
 * 自治体行のデータを更新
 */
function updateMunicipalityRow(configSheet, rowIndex, messageBox, codeInfo) {
  var municipalityName = messageBox.name;
  
  // A列（自治体ID/団体コード）を設定
  if (codeInfo.code) {
    configSheet.getRange(rowIndex, getColumnIndex('MESSAGE_BOXES', 'MUNICIPALITY_ID') + 1).setValue(codeInfo.code);
  } else {
    configSheet.getRange(rowIndex, getColumnIndex('MESSAGE_BOXES', 'MUNICIPALITY_ID') + 1).setValue('');
    console.log('警告: ' + municipalityName + ' のコードが見つからないため、A列を空にしました');
  }
  
  // B列（自治体名）を更新
  configSheet.getRange(rowIndex, getColumnIndex('MESSAGE_BOXES', 'MUNICIPALITY_NAME') + 1).setValue(municipalityName);
  
  // C列（都道府県名）を設定
  if (codeInfo.prefecture) {
    configSheet.getRange(rowIndex, getColumnIndex('MESSAGE_BOXES', 'PREFECTURE') + 1).setValue(codeInfo.prefecture);
  }
  
  // D列（受信箱ID）を更新
  configSheet.getRange(rowIndex, getColumnIndex('MESSAGE_BOXES', 'MESSAGE_BOX_ID') + 1).setValue(messageBox.message_box_id);
  
  // メッセージボックスURLを生成してB列にリンクを設定
  var messageBoxUrl = getRelationBaseUrl() + '/tickets/#/' + messageBox.message_box_id + '/tickets/open/p1';
  var richText = SpreadsheetApp.newRichTextValue()
    .setText(municipalityName)
    .setLinkUrl(messageBoxUrl)
    .build();
  
  configSheet.getRange(rowIndex, getColumnIndex('MESSAGE_BOXES', 'MUNICIPALITY_NAME') + 1).setRichTextValue(richText);
}
