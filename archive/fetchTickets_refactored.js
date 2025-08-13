/**
 * 全自治体のオープンチケットを取得してシートに統合出力
 * リファクタリング版 - バッチプロセッサと定数管理を使用
 */

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

  // シートを初期化
  var sheet = initializeSheet(
    getSheetName('OPEN_TICKETS'),
    getHeaders('OPEN_TICKETS'), 
    '🎫 未対応チケット'
  );
  
  // チケット詳細サイドバーボタンを作成
  createTicketDetailButton(sheet);
  
  // 進捗表示用のセルを準備
  var progressCell = sheet.getRange(getConstant('PROGRESS.CELL_POSITION'));
  
  // バッチプロセッサを作成
  var processor = createBatchProcessor({
    batchSize: getConstant('BATCH_SIZE'),
    waitTime: getConstant('RATE_LIMIT_WAIT'),
    progressCell: progressCell,
    progressPrefix: '自治体処理'
  });
  
  // 自治体設定を配列に変換
  var municipalities = Object.keys(configs).map(function(key) {
    return configs[key];
  });
  
  // 各自治体のチケットを処理する関数
  function processMunicipality(config, index) {
    try {
      var tickets = fetchTicketsForMunicipality(config, 'openTickets');
      
      // チケット分類とラベルの名前を取得
      var caseCategoriesMap = getCaseCategoriesMap(config.messageBoxId);
      var labelsMap = getLabelsMap(config.messageBoxId);
      
      console.log('自治体: ' + config.name + ', チケット数: ' + tickets.length);
      
      // チケットデータを変換
      var ticketDataArray = tickets.map(function(ticket) {
        return convertTicketToRowData(ticket, config, caseCategoriesMap, labelsMap);
      });
      
      return {
        municipalityName: config.name,
        ticketCount: tickets.length,
        ticketData: ticketDataArray
      };
      
    } catch (error) {
      console.error(config.name + ' のチケット取得エラー: ' + error.toString());
      throw error;
    }
  }
  
  // バッチ処理実行
  var processResult = processor.process(municipalities, processMunicipality);
  
  // 結果を集計
  var allTicketsData = [];
  var totalTickets = 0;
  
  processResult.results.forEach(function(result) {
    allTicketsData = allTicketsData.concat(result.ticketData);
    totalTickets += result.ticketCount;
  });
  
  // データを一括書き込み
  if (allTicketsData.length > 0) {
    var writeResult = processor.batchWrite(sheet, allTicketsData, 6, 1);
    
    // 日付列のフォーマット設定
    var dateFormatRange = sheet.getRange(6, getColumnIndex('OPEN_TICKETS', 'CREATED_AT') + 1, 
                                       writeResult.writtenRows, 2);
    dateFormatRange.setNumberFormat(getConstant('DATE_FORMAT'));
    
    // チェックボックス列の設定
    var checkboxRange = sheet.getRange(6, getColumnIndex('OPEN_TICKETS', 'DETAIL_CHECKBOX') + 1, 
                                     writeResult.writtenRows, 1);
    var validation = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    checkboxRange.setDataValidation(validation);
    
    // チケットリンクを設定
    setupTicketLinks(sheet, allTicketsData, configs);
  }
  
  // 結果表示
  var ui = SpreadsheetApp.getUi();
  var message = '全自治体チケット取得完了\n\n';
  message += '成功: ' + processResult.successCount + '/' + municipalities.length + '件の自治体\n';
  message += '取得チケット総数: ' + totalTickets + '件\n';
  
  if (processResult.errors.length > 0) {
    message += 'エラー: ' + processResult.errors.length + '件\n\n';
    message += processResult.errors.map(function(err) {
      return err.item.name + ': ' + err.error;
    }).join('\n');
  }
  
  ui.alert('実行結果', message, ui.ButtonSet.OK);
}

// 以下、既存の関数をそのまま保持
// （後続のリファクタリングフェーズで整理）
