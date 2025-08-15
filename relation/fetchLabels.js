// re:lation APIから全自治体のラベル一覧を取得し、labelsシートに出力する
function fetchLabels() {
  // 全自治体の設定を取得（Slackチャンネル未設定も含む）
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    throw new Error('受信箱設定が見つかりません。📮受信箱取得を先に実行してください。');
  }

  // スクリプトプロパティからAPIキーを取得
  var apiKey = getRelationApiKey();

  // 出力先シート（🏷️ラベル）を取得・新規作成・クリア
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('🏷️ラベル');

  // シートがなければ新規作成、既存シートあればデータクリア
  if (!sheet) {
    sheet = ss.insertSheet('🏷️ラベル');
  } else {
    sheet.clear();
  }
  
  // 対象シートをアクティブにする
  ss.setActiveSheet(sheet);

  // A1にシートタイトルを設定
  sheet.getRange('A1').setValue('🏷️ラベル');
  sheet.getRange('A1').setFontWeight('bold');

  // 進捗表示用のセルを準備（C1セルに進捗を表示）
  var progressCell = sheet.getRange('C1');
  var totalMunicipalities = Object.keys(configs).length;
  progressCell.setValue('進捗: 0/' + totalMunicipalities);
  progressCell.setFontWeight('bold');
  SpreadsheetApp.flush(); // セル更新を即座に反映

  // ヘッダー行を5行目に追加
  sheet.getRange(5, 1, 1, 6).setValues([['受信箱ID', '自治体名', 'ラベルID', 'ラベル名', '色', '作成日']]);
  sheet.getRange(5, 1, 1, 6).setFontWeight('bold');
  
  var totalLabels = 0;
  var successCount = 0;
  var errorList = [];
  var allLabelsData = []; // 全データを格納する配列
  var batchData = []; // 50自治体分のデータを一時保存
  var currentRow = 6; // データ開始行（ヘッダーの下）
  
  // 各自治体のラベルを順次取得・統合
  var configIds = Object.keys(configs);
  
  for (var i = 0; i < configIds.length; i++) {
    var municipalityId = configIds[i];
    var config = configs[municipalityId];
    
    // 50自治体ごとのバッチ開始時に進捗表示
    if (i % 50 === 0) {
      var batchStart = i + 1;
      var batchEnd = Math.min(i + 50, configIds.length);
      progressCell.setValue(batchStart + '-' + batchEnd + '/' + totalMunicipalities + ' 処理中');
      SpreadsheetApp.flush();
      console.log('50自治体バッチ開始: ' + batchStart + '-' + batchEnd + '/' + totalMunicipalities);
    }
    
    try {
      // ラベル一覧APIのエンドポイント
      var apiUrl = getRelationEndpoint('labels', { messageBoxId: config.messageBoxId });

      // クエリパラメータ（1ページ最大100件）
      var params = '?per_page=100&page=1';

      // APIリクエスト（GET）
      var response = UrlFetchApp.fetch(apiUrl + params, {
        method: 'get',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        }
      });

      // レスポンス（JSON配列）をパース
      var labels = JSON.parse(response.getContentText());

      // ラベルデータを配列に追加（一括処理用）
      labels.forEach(function(label) {
        var labelData = [
          config.messageBoxId,            // 受信箱ID
          config.name,                    // 自治体名
          label.label_id || label.id,     // ラベルID（APIレスポンスによって異なる可能性）
          label.name,                     // ラベル名
          label.color || '',              // 色（nullの場合は空文字）
          label.created_at || ''          // 作成日（nullの場合は空文字）
        ];
        allLabelsData.push(labelData);
        batchData.push(labelData);
      });
      
      totalLabels += labels.length;
      successCount++;
      
      // 50自治体ごとに進捗表示を更新とデータ書き込み
      if ((i + 1) % 50 === 0 || i === configIds.length - 1) {
        // 50自治体分のデータを書き込み
        if (batchData.length > 0) {
          var dataRange = sheet.getRange(currentRow, 1, batchData.length, 6);
          dataRange.setValues(batchData);
          currentRow += batchData.length;
          
          console.log('50自治体バッチ書き込み完了: ' + batchData.length + ' 件 (累計: ' + allLabelsData.length + ' 件)');
          batchData = []; // バッチデータをリセット
        }
      }
      
      // エラー以外の個別ログは削除（50自治体ごとにまとめてログ出力）
      
    } catch (error) {
      errorList.push(config.name + ': ' + error.toString());
      console.error(config.name + ' のラベル取得エラー: ' + error.toString());
      
      // エラーの場合は必ず進捗表示を更新
      progressCell.setValue('進捗: ' + (i + 1) + '/' + totalMunicipalities + ' (エラー: ' + config.name + ')');
      SpreadsheetApp.flush(); // セル更新を即座に反映
    }
    
    // 50自治体ごとにレート制限回避のため待機
    // re:lation APIは1分間に60回制限なので、50自治体ごとに60秒待機で安全
    if ((i + 1) % 50 === 0 && i < configIds.length - 1) {
      console.log('50自治体処理完了 - レート制限回避のため60秒待機...');
      progressCell.setValue('API制限のため60秒待機');
      SpreadsheetApp.flush();
      Utilities.sleep(60000); // 60秒待機
    }
  }
  
  // 最終確認：残りのデータがあれば書き込み
  if (batchData.length > 0) {
    var dataRange = sheet.getRange(currentRow, 1, batchData.length, 6);
    dataRange.setValues(batchData);
    console.log('最終バッチ書き込み完了: ' + batchData.length + ' 件');
  }

  // 最終完了表示
  progressCell.setValue('完了: ' + successCount + '/' + totalMunicipalities);
  SpreadsheetApp.flush();
  
  console.log('全処理完了: ' + successCount + '/' + totalMunicipalities + ' 自治体');
  
  // 結果表示
  var resultMessage = '全自治体ラベル取得完了\n\n';
  resultMessage += '成功: ' + successCount + '件の自治体\n';
  resultMessage += '取得ラベル総数: ' + totalLabels + '件\n';
  if (errorList.length > 0) {
    resultMessage += 'エラー: ' + errorList.length + '件\n\n';
    resultMessage += errorList.join('\n');
  }

  sheet.getRange(1, 4).setValue(resultMessage);
}
