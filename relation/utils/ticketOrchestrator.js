/**
 * チケット取得オーケストレーター
 * メイン処理の流れを管理する専用モジュール
 */

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
 * 自治体結果をマージ
 * @param {Object} results 全体結果
 * @param {Object} municipalityResult 自治体結果
 * @param {Object} config 自治体設定
 */
function mergeMunicipalityResult(results, municipalityResult, config) {
  results.successCount++;
  results.totalTickets += municipalityResult.tickets.length;
  results.allTicketsData = results.allTicketsData.concat(municipalityResult.tickets);
  results.batchData = results.batchData.concat(municipalityResult.formattedData);
  results.processedMunicipalities.push({
    name: config.name,
    ticketCount: municipalityResult.tickets.length,
    messageBoxId: config.messageBoxId
  });
}

/**
 * 自治体処理エラーの処理
 * @param {Object} results 全体結果
 * @param {Object} config 自治体設定
 * @param {Error} error エラーオブジェクト
 */
function handleMunicipalityError(results, config, error) {
  var errorInfo = {
    municipality: config.name,
    messageBoxId: config.messageBoxId,
    error: error.toString(),
    timestamp: new Date().toISOString()
  };
  
  results.errorList.push(errorInfo);
  
  // エラーログ
  console.error('自治体チケット取得エラー:', config.name, error.toString());
  
  // Slack通知（重要なエラーの場合）
  if (isSignificantError(error)) {
    sendSlackErrorNotification(
      '自治体チケット取得でエラーが発生しました',
      '自治体: ' + config.name,
      errorInfo
    );
  }
}

/**
 * バッチの進捗表示を更新
 * @param {Range} progressCell 進捗表示セル
 * @param {number} currentIndex 現在のインデックス
 * @param {number} totalCount 全体数
 */
function updateBatchProgress(progressCell, currentIndex, totalCount) {
  var batchStart = currentIndex + 1;
  var batchEnd = Math.min(currentIndex + 50, totalCount);
  var progressText = '自治体処理 ' + batchStart + '-' + batchEnd + ' / ' + totalCount;
  
  progressCell.setValue(progressText);
  SpreadsheetApp.flush(); // 即座に表示
}

/**
 * バッチデータをシートに書き込み
 * @param {Sheet} sheet 対象シート
 * @param {Array} batchData バッチデータ
 * @param {number} startRow 開始行
 * @return {number} 次の開始行
 */
function writeBatchToSheet(sheet, batchData, startRow) {
  if (batchData.length === 0) {
    return startRow;
  }
  
  try {
    var range = sheet.getRange(startRow, 1, batchData.length, batchData[0].length);
    range.setValues(batchData);
    
    return startRow + batchData.length;
    
  } catch (error) {
    console.error('シート書き込みエラー:', error.toString());
    throw new Error('シートへのデータ書き込みに失敗しました: ' + error.toString());
  }
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

/**
 * 取得完了の通知
 * @param {Object} summary 完了サマリー
 * @param {boolean} isSuccess 成功フラグ
 */
function notifyFetchCompletion(summary, isSuccess) {
  if (isSuccess) {
    sendSlackSuccessNotification(
      'オープンチケットの取得が完了しました',
      {
        processedCount: summary.totalMunicipalities,
        duration: summary.duration,
        summary: summary.totalTickets + '件のチケットを取得'
      }
    );
  }
  
  // エラーがある場合は別途通知
  if (summary.errors.length > 0) {
    var errorMessage = summary.errors.length + '件の自治体でエラーが発生しました';
    sendSlackErrorNotification(errorMessage, 'チケット取得処理', {
      errorCount: summary.errors.length,
      successCount: summary.successfulMunicipalities
    });
  }
}

/**
 * 取得エラーの処理
 * @param {Error} error エラーオブジェクト
 * @param {Object} options オプション
 */
function handleFetchError(error, options) {
  console.error('チケット取得処理でエラーが発生:', error.toString());
  
  // Slack通知
  if (options.enableNotifications !== false) {
    sendSlackErrorNotification(
      'チケット取得処理が失敗しました',
      'メイン処理',
      {
        error: error.toString(),
        timestamp: new Date().toISOString()
      }
    );
  }
}

/**
 * 取得サマリーをログ出力
 * @param {Object} summary サマリー
 */
function logFetchSummary(summary) {
  console.log('=== チケット取得完了 ===');
  console.log('処理自治体数:', summary.totalMunicipalities);
  console.log('成功:', summary.successfulMunicipalities);
  console.log('失敗:', summary.failedMunicipalities);
  console.log('取得チケット数:', summary.totalTickets);
  console.log('処理時間:', summary.duration);
  
  if (summary.errors.length > 0) {
    console.log('エラー詳細:');
    summary.errors.forEach(function(error) {
      console.log(' -', error.municipality, ':', error.error);
    });
  }
}

/**
 * 重要なエラーかどうかを判定
 * @param {Error} error エラーオブジェクト
 * @return {boolean} 重要エラーフラグ
 */
function isSignificantError(error) {
  var significantPatterns = [
    'API',
    'Authentication',
    'Network',
    'Timeout',
    'Rate',
    'Unauthorized'
  ];
  
  var errorString = error.toString().toLowerCase();
  
  return significantPatterns.some(function(pattern) {
    return errorString.indexOf(pattern.toLowerCase()) !== -1;
  });
}

/**
 * 期間をフォーマット
 * @param {number} milliseconds ミリ秒
 * @return {string} フォーマット済み期間
 */
function formatDuration(milliseconds) {
  var seconds = Math.floor(milliseconds / 1000);
  var minutes = Math.floor(seconds / 60);
  var hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return hours + '時間' + (minutes % 60) + '分' + (seconds % 60) + '秒';
  } else if (minutes > 0) {
    return minutes + '分' + (seconds % 60) + '秒';
  } else {
    return seconds + '秒';
  }
}
