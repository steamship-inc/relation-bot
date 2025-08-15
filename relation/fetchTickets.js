/**
 * 全自治体のオープンチケットを取得してシートに統合出力
 * メニューから呼び出される主要機能
 */
function fetchOpenTickets() {
  // 全自治体の設定を取得（Slackチャンネル未設定も含む）
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    throw new Error('受信箱設定が見つかりません。📮受信箱取得を先に実行してください。');
  }

  // 開始前に🎫未対応チケットシートを初期化
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('🎫未対応チケット');
  
  if (!sheet) {
    sheet = ss.insertSheet('🎫未対応チケット');
  } else {
    sheet.clear();
  }
  
  // 対象シートをアクティブにする
  ss.setActiveSheet(sheet);

  // A1セルにシートタイトルを表示
  var titleCell = sheet.getRange('A1');
  titleCell.setValue('🎫 未対応チケット');
  titleCell.setFontWeight('bold');
  SpreadsheetApp.flush();

  // 進捗表示用のセルを準備（C1セルに進捗を表示）
  var progressCell = sheet.getRange('C1');
  var totalMunicipalities = Object.keys(configs).length;
  progressCell.setValue('進捗: 0/' + totalMunicipalities);
  progressCell.setFontWeight('bold');
  SpreadsheetApp.flush(); // セル更新を即座に反映

  // ヘッダー行を5行目に追加
  sheet.getRange(5, 1, 1, 12).setValues([['受信箱ID', '自治体名', 'ID', 'タイトル', 'ステータス', '担当者', '作成日', '更新日', 'チケット分類', 'ラベル', '保留理由ID', '色']]);
  sheet.getRange(5, 1, 1, 12).setFontWeight('bold');
  
  var successCount = 0;
  var errorList = [];
  var totalTickets = 0;
  var allTicketsData = []; // 全データを格納する配列
  var batchData = []; // 50自治体分のデータを一時保存
  var currentRow = 6; // データ開始行（ヘッダーの下）
  
  // 各自治体のチケットを順次取得・統合
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
      // APIキーを取得
      var apiKey = getRelationApiKey();
      
      // チケット検索APIを呼び出し
      var apiUrl = getRelationEndpoint('tickets_search', { messageBoxId: config.messageBoxId });
      var payload = {
        status_cds: DEFAULT_SEARCH_CONDITIONS.status_cds,
        per_page: DEFAULT_SEARCH_CONDITIONS.per_page,
        page: DEFAULT_SEARCH_CONDITIONS.page
      };
      
      var response = UrlFetchApp.fetch(apiUrl, {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload)
      });
      
      var tickets = JSON.parse(response.getContentText());
      
      console.log('自治体: ' + config.name + ', チケット数: ' + tickets.length);
      
      // デバッグ用：最初のチケットの全プロパティを出力（APIレスポンス確認用）
      if (tickets.length > 0) {
        console.log('=== API レスポンス サンプル（' + config.name + '）===');
        console.log('チケット数: ' + tickets.length);
        console.log('最初のチケットの全プロパティ: ' + JSON.stringify(tickets[0], null, 2));
        console.log('=====================================');
      }
      
      // チケットデータを配列に追加（一括処理用）
      tickets.forEach(function(ticket) {
        var caseCategoryIds = ticket.case_category_ids || [];
        var labelIds = ticket.label_ids || [];
        
        // デバッグ用ログ：ラベルIDをログ出力
        if (labelIds.length > 0) {
          console.log('チケットID: ' + ticket.ticket_id + ', ラベルID: ' + JSON.stringify(labelIds));
        }
        
        var ticketData = [
          config.messageBoxId,        // 受信箱ID
          config.name,                // 自治体名
          ticket.ticket_id,           // チケットID
          ticket.title,               // タイトル
          ticket.status_cd,           // ステータス
          ticket.assignee || '',      // 担当者のメンション名
          parseDate(ticket.created_at),          // 作成日（Dateオブジェクト）
          parseDate(ticket.last_updated_at),     // 更新日（Dateオブジェクト）
          caseCategoryIds.join(', '), // チケット分類ID
          labelIds.join(', '),        // ラベルID
          ticket.pending_reason_id || '',        // 保留理由ID
          ticket.color_cd || ''       // 色
        ];
        allTicketsData.push(ticketData);
        batchData.push(ticketData);
      });
      
      totalTickets += tickets.length;
      successCount++;
      
      // 50自治体ごとにデータ書き込み
      if ((i + 1) % 50 === 0 || i === configIds.length - 1) {
        // 50自治体分のデータを書き込み
        if (batchData.length > 0) {
          var dataRange = sheet.getRange(currentRow, 1, batchData.length, 12);
          dataRange.setValues(batchData);
          
          // 日付列（G列：作成日、H列：更新日）のフォーマットを設定
          var dateFormatRange = sheet.getRange(currentRow, 7, batchData.length, 2); // G列とH列
          dateFormatRange.setNumberFormat('yyyy/mm/dd hh:mm');
          
          // チケットIDとタイトルにリンクを設定
          for (var j = 0; j < batchData.length; j++) {
            var ticketRowData = batchData[j];
            var ticketId = ticketRowData[2]; // チケットID
            var title = ticketRowData[3]; // タイトル
            var municipalityName = ticketRowData[1]; // 自治体名
            
            // 自治体設定から受信箱IDを取得
            var ticketConfig = null;
            for (var configKey in configs) {
              if (configs[configKey].name === municipalityName) {
                ticketConfig = configs[configKey];
                break;
              }
            }
            
            if (ticketConfig) {
              // D列（タイトル）にre:lationへのリンクを設定
              var ticketUrl = getRelationEndpoint('ticket_web_url', {
                messageBoxId: ticketConfig.messageBoxId,
                ticketId: ticketId,
                status: 'open'
              });
              var richTextTitle = SpreadsheetApp.newRichTextValue()
                .setText(title)
                .setLinkUrl(ticketUrl)
                .build();
              
              sheet.getRange(currentRow + j, 4).setRichTextValue(richTextTitle);
            }
          }
          
          currentRow += batchData.length;
          console.log('50自治体バッチ書き込み完了: ' + batchData.length + ' 件 (累計: ' + allTicketsData.length + ' 件)');
          batchData = []; // バッチデータをリセット
        }
      }
      
      // Slack通知（Slackチャンネル設定がある場合のみ）
      // if (config.slackChannel) {
      //   sendSlackToMunicipality(tickets, config, false);
      // }
      
    } catch (error) {
      errorList.push(config.name + ': ' + error.toString());
      console.error(config.name + ' のチケット取得エラー: ' + error.toString());
      
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
    var dataRange = sheet.getRange(currentRow, 1, batchData.length, 12);
    dataRange.setValues(batchData);
    console.log('最終バッチ書き込み完了: ' + batchData.length + ' 件');
  }

  // 最終完了表示
  progressCell.setValue('完了: ' + successCount + '/' + totalMunicipalities);
  SpreadsheetApp.flush();
  
  console.log('全処理完了: ' + successCount + '/' + totalMunicipalities + ' 自治体');
  
  // 結果表示をD1セルに出力
  var resultMessage = '全自治体チケット取得完了\n'
    + '成功: ' + successCount + '件の自治体\n'
    + '取得チケット総数: ' + totalTickets + '件\n';
  if (errorList.length > 0) {
    resultMessage += 'エラー: ' + errorList.length + '件\n' + errorList.join('\n');
  }
  sheet.getRange('D1').setValue(resultMessage);
}





/**
 * ISO 8601形式の日時をDateオブジェクトに変換
 * @param {string} isoString ISO 8601形式の日時文字列
 * @return {Date|string} Dateオブジェクトまたは空文字列
 */
function parseDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString);
}





/**
 * チケット詳細をAPIから取得
 * @param {string} messageBoxId 受信箱ID
 * @param {string} ticketId チケットID
 * @return {Object} チケット詳細オブジェクト
 */
function fetchTicketDetail(messageBoxId, ticketId) {
  // APIキーを取得
  var apiKey = getRelationApiKey();
  
  // チケット詳細APIのエンドポイント
  var apiUrl = getRelationEndpoint('ticket_detail', { 
    messageBoxId: messageBoxId, 
    ticketId: ticketId 
  });
  
  
  // APIリクエスト（GET）
  var response = UrlFetchApp.fetch(apiUrl, {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    }
  });
  
  // レスポンスをパース
  var ticketDetail = JSON.parse(response.getContentText());
  console.log('チケット詳細取得成功: ' + ticketId);
  
  return ticketDetail;
}




