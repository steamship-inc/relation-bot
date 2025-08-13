/**
 * re:lation メッセージボックス取得機能
 * menu.js の fetchMessageBoxes に対応
 */

/**
 * re:lation APIからメッセージボックス一覧を取得し、受信箱シートを更新する
 */
function fetchMessageBoxes() {
  // メッセージボックス一覧APIから取得
  var messageBoxes = callRelationApi(buildMessageBoxesUrl());

  // 📮受信箱シートを取得・更新
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName('📮受信箱');

  if (!configSheet) {
    // 設定シートがない場合は作成
    console.log('受信箱シートが見つかりません。新規作成します。');
    createMunicipalityConfigSheet();
    configSheet = ss.getSheetByName('📮受信箱');
  }
  
  // 対象シートをアクティブにする
  ss.setActiveSheet(configSheet);

  // A1にシートタイトルを設定
  configSheet.getRange('A1').setValue('📮受信箱');
  
  // 進捗表示用のセルを準備（C1セルに進捗を表示）
  var progressCell = configSheet.getRange('C1');
  var totalMessageBoxes = messageBoxes.length;
  updateProgress(progressCell, 0, totalMessageBoxes);
  
  var data = configSheet.getDataRange().getValues();
  var headers = data[4]; // 5行目がヘッダー
  
  // ヘッダー行の確認（必要に応じて修正）
  if (headers.length < 4 || headers[1] !== '自治体名' || headers[3] !== '受信箱ID') {
    console.log('受信箱シートのヘッダーを確認・修正します。');
    var correctHeaders = [
      '自治体ID',
      '自治体名', 
      '都道府県',
      '受信箱ID',
      'Slackチャンネル',
      'Slack通知テンプレート(JSON)',
      'Slack通知フィルタ(JSON)'
    ];
    configSheet.getRange(5, 1, 1, correctHeaders.length).setValues([correctHeaders]);
  }
  
  // 既存データの行数を確認
  var existingRowCount = data.length;
  
  // コード表からのマッピング用データを事前に読み込み
  var codeTableMap = loadCodeTableMap();
  
  var processedCount = 0;
  
  // バッチ処理設定
  var batchOptions = {
    batchSize: 50,
    waitTime: 60000,
    progressCell: progressCell,
    onBatchComplete: function(batchData, index) {
      updateProgress(progressCell, index + 1, totalMessageBoxes);
      console.log('50自治体バッチ完了: ' + (index + 1) + '/' + totalMessageBoxes);
    }
  };
  
  // メッセージボックス一覧を処理
  processBatch(messageBoxes, function(messageBox, i) {
    var rowIndex = i + 6; // ヘッダー行（5行目）の次から開始（1ベース）
    
    // 既存行の範囲を超える場合は新しい行を追加
    if (rowIndex > data.length) {
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
    
    processedCount++;
    
    return null; // バッチデータとして蓄積しない（直接シートに書き込むため）
    
  }, batchOptions);
  
  // 最終完了表示
  updateProgress(progressCell, processedCount, totalMessageBoxes, '完了');
  console.log('全処理完了: ' + processedCount + '/' + totalMessageBoxes + ' 自治体');
  
  // 結果表示
  var ui = SpreadsheetApp.getUi();
  var message = 'メッセージボックス一覧取得完了\n\n';
  message += '処理済み: ' + processedCount + '/' + totalMessageBoxes + ' 自治体\n\n';
  message += '📮受信箱シートが更新されました。\n';
  message += 'Slackチャンネル情報などを設定してご利用ください。';
  
  ui.alert('処理完了', message, ui.ButtonSet.OK);
}

/**
 * 自治体団体コード表からマッピング用データを読み込み
 * @return {Object} マッピング用データ
 */
function loadCodeTableMap() {
  // 自治体団体コード表をスプレッドシートから取得
  var codeTableMap = {};
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var codeSheet = ss.getSheetByName('自治体団体コード表');
    
    if (!codeSheet) {
      console.log('自治体団体コード表シートが見つかりません。コード変換をスキップします。');
      return {};
    }
    
    var codeData = codeSheet.getDataRange().getValues();
    
    // ヘッダー行をスキップして2行目以降を処理
    for (var i = 1; i < codeData.length; i++) {
      var row = codeData[i];
      var code = row[0];        // A列: 団体コード
      var prefecture = row[1];  // B列: 都道府県名
      var municipality = row[2]; // C列: 市区町村名
      
      if (code && municipality) {
        // 正規化処理：記号を除去し、英数字のみに変換
        var normalizedName = normalizeString(municipality);
        codeTableMap[normalizedName] = {
          code: code,
          prefecture: prefecture || '',
          originalName: municipality
        };
      }
    }
    
    console.log('自治体団体コード表読み込み完了: ' + Object.keys(codeTableMap).length + '件');
    
  } catch (error) {
    console.error('自治体団体コード表の読み込みエラー: ' + error.toString());
  }
  
  return codeTableMap;
}

/**
 * コード表から自治体名を検索
 * @param {string} municipalityName 検索する自治体名
 * @param {Object} codeTableMap コード表マップ
 * @return {Object} マッチした自治体情報
 */
function findMunicipalityInCodeTable(municipalityName, codeTableMap) {
  try {
    // 正規化処理：記号を除去し、英数字のみに変換
    var normalizedSearchName = normalizeString(municipalityName);
    
    // 1. 完全一致での検索
    if (codeTableMap[normalizedSearchName]) {
      return codeTableMap[normalizedSearchName];
    }
    
    // 2. 部分一致での検索（前方一致）
    for (var normalizedName in codeTableMap) {
      if (normalizedName.indexOf(normalizedSearchName) === 0) {
        console.log('部分一致（前方）で発見: ' + municipalityName + ' -> ' + codeTableMap[normalizedName].originalName);
        return codeTableMap[normalizedName];
      }
    }
    
    // 3. 部分一致での検索（後方一致）
    for (var normalizedName in codeTableMap) {
      if (normalizedSearchName.indexOf(normalizedName) === 0) {
        console.log('部分一致（後方）で発見: ' + municipalityName + ' -> ' + codeTableMap[normalizedName].originalName);
        return codeTableMap[normalizedName];
      }
    }
    
    // 4. 部分一致での検索（包含）
    for (var normalizedName in codeTableMap) {
      if (normalizedName.indexOf(normalizedSearchName) !== -1 || normalizedSearchName.indexOf(normalizedName) !== -1) {
        console.log('部分一致（包含）で発見: ' + municipalityName + ' -> ' + codeTableMap[normalizedName].originalName);
        return codeTableMap[normalizedName];
      }
    }
    
    console.log('マッチなし: ' + municipalityName + ' (正規化後: ' + normalizedSearchName + ')');
    return { code: null, prefecture: null, originalName: municipalityName };
    
  } catch (error) {
    console.error('自治体名検索エラー (' + municipalityName + '): ' + error.toString());
    return { code: null, prefecture: null, originalName: municipalityName };
  }
}

/**
 * 文字列を正規化（記号除去、ひらがな・カタカナ・英数字のみ残す）
 * @param {string} str 正規化する文字列
 * @return {string} 正規化済み文字列
 */
function normalizeString(str) {
  if (!str) return '';
  
  return str
    .replace(/[々〇〆ヶ]/g, '') // 特殊文字除去
    .replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBFa-zA-Z0-9]/g, '') // ひらがな、カタカナ、漢字、英数字以外を除去
    .toLowerCase();
}