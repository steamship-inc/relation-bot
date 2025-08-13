/**
 * 🎫 チケット関連機能
 * - 未対応チケット取得
 * - チケット詳細表示
 * - チケットデータ処理
 */

/**
 * 全自治体のオープンチケットを取得してシートに統合出力
 * メニューから呼び出される主要機能
 */
function fetchOpenTickets() {
  try {
    console.log('=== 全自治体オープンチケット取得開始 ===');
    
    // オーケストレーターを使用して完全なワークフローを実行
    var summary = executeOpenTicketsFetch({
      enableNotifications: true,
      enableProgressDisplay: true
    });
    
    console.log('=== 全自治体オープンチケット取得完了 ===');
    console.log('処理結果: 成功 ' + summary.successfulMunicipalities + '/' + summary.totalMunicipalities + ' 自治体');
    console.log('取得チケット総数: ' + summary.totalTickets + ' 件');
    console.log('処理時間: ' + summary.duration);
    
    // 結果通知
    var ui = SpreadsheetApp.getUi();
    var message = '処理完了\\n\\n' +
                  '自治体数: ' + summary.totalMunicipalities + '\\n' +
                  'チケット数: ' + summary.totalTickets + '\\n' +
                  '処理時間: ' + summary.duration;
    
    if (summary.errors.length > 0) {
      message += '\\n\\nエラー: ' + summary.errors.length + '件';
    }
    
    ui.alert('チケット取得完了', message, ui.ButtonSet.OK);
    
    return summary;
    
  } catch (error) {
    handleError(error, 'fetchOpenTickets', 
      'チケット取得処理でエラーが発生しました。\\n\\n' +
      'エラー詳細: ' + error.toString() + '\\n\\n' +
      '以下を確認してください:\\n' +
      '1. ネットワーク接続\\n' +
      '2. APIキーの設定\\n' +
      '3. 受信箱シートの設定'
    );
    throw error;
  }
}

/**
 * サイドバーで詳細表示
 * メニューから呼び出される機能
 */
function showTicketDetailSidebar() {
  try {
    var html = HtmlService.createHtmlOutputFromFile('relation/ticket_detail_sidebar')
        .setTitle('チケット詳細');
    SpreadsheetApp.getUi().showSidebar(html);
  } catch (error) {
    handleError(error, 'showTicketDetailSidebar', 'サイドバー表示でエラーが発生しました。');
  }
}

/**
 * オープンチケット取得の完全なワークフロー
 * @param {Object} options 実行オプション
 * @return {Object} 実行結果
 */
function executeOpenTicketsFetch(options) {
  options = options || {};
  var startTime = new Date();
  
  try {
    // 1. 事前準備
    var preparation = prepareTicketFetch(options);
    
    // 2. チケット取得処理
    var results = processMunicipalityTickets(preparation);
    
    // 3. 結果の後処理
    var summary = finalizeTicketFetch(results, startTime);
    
    // 4. 成功通知
    if (options.enableNotifications !== false) {
      notifyFetchCompletion(summary, true);
    }
    
    return summary;
    
  } catch (error) {
    handleFetchError(error, options);
    throw error;
  }
}

/**
 * チケット取得の事前準備
 * @param {Object} options オプション
 * @return {Object} 準備データ
 */
function prepareTicketFetch(options) {
  // 自治体設定を取得
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
  
  // 進捗表示の準備
  var progressCell = sheet.getRange(getConstant('PROGRESS.CELL_POSITION'));
  
  // バッチプロセッサを作成
  var processor = createBatchProcessor({
    batchSize: getConstant('BATCH_SIZE'),
    waitTime: getConstant('RATE_LIMIT_WAIT'),
    progressCell: progressCell,
    progressPrefix: '自治体処理'
  });
  
  return {
    configs: configs,
    sheet: sheet,
    progressCell: progressCell,
    processor: processor,
    configIds: Object.keys(configs),
    options: options
  };
}

/**
 * 全自治体のチケットを処理
 * @param {Object} preparation 準備データ
 * @return {Object} 処理結果
 */
function processMunicipalityTickets(preparation) {
  var { configs, sheet, progressCell, processor, configIds, options } = preparation;
  
  var results = {
    successCount: 0,
    errorList: [],
    totalTickets: 0,
    allTicketsData: [],
    batchData: [],
    processedMunicipalities: []
  };
  
  var currentRow = 6; // データ開始行
  
  // 各自治体を順次処理
  for (var i = 0; i < configIds.length; i++) {
    var municipalityId = configIds[i];
    var config = configs[municipalityId];
    
    try {
      // バッチ開始の進捗表示
      if (i % 50 === 0) {
        updateBatchProgress(progressCell, i, configIds.length);
      }
      
      // 単一自治体のチケット取得
      var municipalityResult = processSingleMunicipality(config, municipalityId, options);
      
      // 結果をマージ
      mergeMunicipalityResult(results, municipalityResult, config);
      
      // 50自治体ごとにシートに書き込み（メモリ効率化）
      if (results.batchData.length >= 50 || i === configIds.length - 1) {
        currentRow = writeBatchToSheet(sheet, results.batchData, currentRow);
        results.batchData = []; // バッチデータクリア
      }
      
      // プロセッサーの待機処理
      processor.process(function() {
        return { municipality: config.name, ticketCount: municipalityResult.tickets.length };
      });
      
    } catch (error) {
      handleMunicipalityError(results, config, error);
    }
  }
  
  return results;
}

/**
 * 単一自治体のチケット処理
 * @param {Object} config 自治体設定
 * @param {string} municipalityId 自治体ID
 * @param {Object} options オプション
 * @return {Object} 処理結果
 */
function processSingleMunicipality(config, municipalityId, options) {
  // チケット取得
  var tickets = fetchTicketsForMunicipality(config.messageBoxId);
  
  // チケットデータの加工
  var processedTickets = tickets.map(function(ticket) {
    return enhanceTicketData(ticket, config);
  });
  
  // フィルタリング（必要に応じて）
  if (options.filters) {
    processedTickets = filterTickets(processedTickets, options.filters);
  }
  
  // スプレッドシート用にフォーマット
  var formattedData = formatTicketsForSpreadsheet(processedTickets);
  
  return {
    tickets: processedTickets,
    formattedData: formattedData,
    municipality: config.name,
    messageBoxId: config.messageBoxId
  };
}

/**
 * チケットデータを拡張
 * @param {Object} ticket 元チケットデータ
 * @param {Object} config 自治体設定
 * @return {Object} 拡張されたチケットデータ
 */
function enhanceTicketData(ticket, config) {
  return {
    ...ticket,
    municipality_name: config.name,
    message_box_id: config.messageBoxId,
    url: buildTicketUrl(config.messageBoxId, ticket.ticket_id, ticket.status),
    region: config.region || detectRegion(config.name),
    priority: config.priority || 'normal'
  };
}

/**
 * チケット取得処理の最終化
 * @param {Object} results 処理結果
 * @param {Date} startTime 開始時刻
 * @return {Object} 完了サマリー
 */
function finalizeTicketFetch(results, startTime) {
  var endTime = new Date();
  var duration = formatDuration(endTime - startTime);
  
  // 統計情報の生成
  var statistics = generateTicketStatistics(results.allTicketsData);
  
  // サマリー作成
  var summary = {
    totalMunicipalities: results.processedMunicipalities.length,
    successfulMunicipalities: results.successCount,
    failedMunicipalities: results.errorList.length,
    totalTickets: results.totalTickets,
    duration: duration,
    statistics: statistics,
    processedMunicipalities: results.processedMunicipalities,
    errors: results.errorList,
    startTime: startTime,
    endTime: endTime
  };
  
  // コンソールに結果表示
  logFetchSummary(summary);
  
  return summary;
}
