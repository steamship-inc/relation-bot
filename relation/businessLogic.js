/**
 * ビジネスロジック層
 * アプリケーションの主要な業務ロジックを管理
 */

/**
 * チケット管理サービス
 */
var TicketService = {
  
  /**
   * 全自治体のオープンチケットを取得・統合
   * @return {Object} 処理結果
   */
  fetchAllOpenTickets: function() {
    // 設定取得
    var configs = ConfigService.getMunicipalityConfigs(true);
    
    if (Object.keys(configs).length === 0) {
      throw new Error('受信箱設定が見つかりません。📮受信箱取得を先に実行してください。');
    }

    // シート初期化
    var sheet = SpreadsheetService.initializeSheet(
      getSheetName('OPEN_TICKETS'),
      getHeaders('OPEN_TICKETS'), 
      '🎫 未対応チケット'
    );
    
    // チケット詳細サイドバーボタンを作成
    this._createTicketDetailButton(sheet);
    
    // 進捗管理
    var progressCell = sheet.getRange(getConstant('PROGRESS.CELL_POSITION'));
    
    // バッチ処理
    var processor = createBatchProcessor({
      batchSize: getConstant('BATCH_SIZE'),
      waitTime: getConstant('RATE_LIMIT_WAIT'),
      progressCell: progressCell,
      progressPrefix: '自治体処理'
    });
    
    // 自治体を配列に変換
    var municipalities = Object.keys(configs).map(function(key) {
      return configs[key];
    });
    
    // 各自治体のチケットを処理
    var self = this;
    var processResult = processor.process(municipalities, function(config, index) {
      return self._processMunicipalityTickets(config);
    });
    
    // 結果を統合
    var allTicketsData = [];
    var totalTickets = 0;
    
    processResult.results.forEach(function(result) {
      allTicketsData = allTicketsData.concat(result.ticketData);
      totalTickets += result.ticketCount;
    });
    
    // データ書き込み
    if (allTicketsData.length > 0) {
      this._writeTicketsToSheet(sheet, allTicketsData, processor);
      this._setupTicketLinks(sheet, allTicketsData, configs);
    }
    
    return {
      successCount: processResult.successCount,
      totalCount: municipalities.length,
      dataCount: totalTickets,
      errors: processResult.errors
    };
  },
  
  /**
   * 単一自治体のチケット処理（内部メソッド）
   * @param {Object} config 自治体設定
   * @return {Object} 処理結果
   */
  _processMunicipalityTickets: function(config) {
    // チケット取得
    var tickets = RelationApiService.fetchTickets(config, 'openTickets');
    
    // 分類・ラベルマップ取得
    var caseCategoriesMap = ConfigService.getCaseCategoriesMap(config.messageBoxId);
    var labelsMap = ConfigService.getLabelsMap(config.messageBoxId);
    
    console.log('自治体: ' + config.name + ', チケット数: ' + tickets.length);
    
    // チケットデータ変換
    var self = this;
    var ticketDataArray = tickets.map(function(ticket) {
      return self._convertTicketToRowData(ticket, config, caseCategoriesMap, labelsMap);
    });
    
    return {
      municipalityName: config.name,
      ticketCount: tickets.length,
      ticketData: ticketDataArray
    };
  },
  
  /**
   * チケットデータ変換（内部メソッド）
   * @param {Object} ticket チケットオブジェクト
   * @param {Object} config 自治体設定
   * @param {Object} caseCategoriesMap チケット分類マップ
   * @param {Object} labelsMap ラベルマップ
   * @return {Array} 行データ
   */
  _convertTicketToRowData: function(ticket, config, caseCategoriesMap, labelsMap) {
    var caseCategoryIds = ticket.case_category_ids || [];
    var labelIds = ticket.label_ids || [];
    
    var categoryNames = getCategoryNames(caseCategoryIds, caseCategoriesMap);
    var labelNames = getLabelNames(labelIds, labelsMap);
    
    return [
      config.messageBoxId,                        // 受信箱ID
      config.name,                                // 自治体名
      ticket.ticket_id,                           // チケットID
      ticket.title,                               // タイトル
      ticket.status_cd,                           // ステータス
      ticket.assignee || '',                      // 担当者のメンション名
      parseDate(ticket.created_at),               // 作成日（Dateオブジェクト）
      parseDate(ticket.last_updated_at),          // 更新日（Dateオブジェクト）
      categoryNames.join(', '),                   // チケット分類名
      labelNames.join(', '),                      // ラベル名
      ticket.pending_reason_id || '',             // 保留理由ID
      ticket.color_cd || '',                      // 色
      false                                       // 詳細表示チェックボックス
    ];
  },
  
  /**
   * シートへのチケットデータ書き込み（内部メソッド）
   * @param {Sheet} sheet 対象シート
   * @param {Array} ticketData チケットデータ配列
   * @param {Object} processor バッチプロセッサ
   */
  _writeTicketsToSheet: function(sheet, ticketData, processor) {
    var writeResult = processor.batchWrite(sheet, ticketData, 6, 1);
    
    // 日付列のフォーマット設定
    SpreadsheetService.formatRange(
      sheet, 
      6, 
      getColumnIndex('OPEN_TICKETS', 'CREATED_AT') + 1, 
      writeResult.writtenRows, 
      2,
      { numberFormat: getConstant('DATE_FORMAT') }
    );
    
    // チェックボックス列の設定
    var validation = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    SpreadsheetService.formatRange(
      sheet, 
      6, 
      getColumnIndex('OPEN_TICKETS', 'DETAIL_CHECKBOX') + 1, 
      writeResult.writtenRows, 
      1,
      { dataValidation: validation }
    );
  },
  
  /**
   * チケットリンク設定（内部メソッド）
   * @param {Sheet} sheet 対象シート
   * @param {Array} ticketDataArray チケットデータ配列
   * @param {Object} configs 自治体設定
   */
  _setupTicketLinks: function(sheet, ticketDataArray, configs) {
    setupTicketLinks(sheet, ticketDataArray, configs);
  },
  
  /**
   * チケット詳細ボタン作成（内部メソッド）
   * @param {Sheet} sheet 対象シート
   */
  _createTicketDetailButton: function(sheet) {
    createTicketDetailButton(sheet);
  }
};

/**
 * マスタデータ管理サービス
 */
var MasterDataService = {
  
  /**
   * チケット分類データ取得・更新
   * @return {Object} 処理結果
   */
  fetchAllCaseCategories: function() {
    // 設定取得
    var configs = ConfigService.getMunicipalityConfigs(true);
    
    if (Object.keys(configs).length === 0) {
      throw new Error('受信箱設定が見つかりません。📮受信箱取得を先に実行してください。');
    }

    // シート初期化
    var sheet = SpreadsheetService.initializeSheet(
      getSheetName('CASE_CATEGORIES'),
      getHeaders('CASE_CATEGORIES'), 
      '🏷️チケット分類'
    );
    
    // バッチ処理実行
    var result = this._processMasterData(configs, sheet, 'チケット分類', function(config) {
      var categories = RelationApiService.fetchCaseCategories(config);
      return categories.map(function(category) {
        return [
          config.messageBoxId,        // 受信箱ID
          config.name,                // 自治体名
          category.case_category_id,  // チケット分類ID
          category.name,              // チケット分類名
          category.parent_id || '',   // 親分類ID
          category.archived || false  // アーカイブ済み
        ];
      });
    });
    
    return result;
  },
  
  /**
   * ラベルデータ取得・更新
   * @return {Object} 処理結果
   */
  fetchAllLabels: function() {
    // 設定取得
    var configs = ConfigService.getMunicipalityConfigs(true);
    
    if (Object.keys(configs).length === 0) {
      throw new Error('受信箱設定が見つかりません。📮受信箱取得を先に実行してください。');
    }

    // シート初期化
    var sheet = SpreadsheetService.initializeSheet(
      getSheetName('LABELS'),
      getHeaders('LABELS'), 
      '🏷️ラベル'
    );
    
    // バッチ処理実行
    var result = this._processMasterData(configs, sheet, 'ラベル', function(config) {
      var labels = RelationApiService.fetchLabels(config);
      return labels.map(function(label) {
        return [
          config.messageBoxId,     // 受信箱ID
          config.name,             // 自治体名
          label.label_id,          // ラベルID
          label.name,              // ラベル名
          label.color_cd || '',    // 色
          label.sort_order || 0    // 並び順
        ];
      });
    });
    
    return result;
  },
  
  /**
   * マスタデータ処理の共通ロジック（内部メソッド）
   * @param {Object} configs 自治体設定
   * @param {Sheet} sheet 対象シート
   * @param {string} dataType データタイプ名
   * @param {Function} dataProcessor データ処理関数
   * @return {Object} 処理結果
   */
  _processMasterData: function(configs, sheet, dataType, dataProcessor) {
    // 進捗管理
    var progressCell = sheet.getRange(getConstant('PROGRESS.CELL_POSITION'));
    
    // バッチプロセッサ作成
    var processor = createBatchProcessor({
      batchSize: getConstant('BATCH_SIZE'),
      waitTime: getConstant('RATE_LIMIT_WAIT'),
      progressCell: progressCell,
      progressPrefix: dataType + '取得'
    });
    
    // 自治体を配列に変換
    var municipalities = Object.keys(configs).map(function(key) {
      return configs[key];
    });
    
    // 各自治体のデータを処理
    var processResult = processor.process(municipalities, function(config, index) {
      try {
        var data = dataProcessor(config);
        console.log('自治体: ' + config.name + ', ' + dataType + '数: ' + data.length);
        
        return {
          municipalityName: config.name,
          dataCount: data.length,
          data: data
        };
      } catch (error) {
        console.error(config.name + ' の' + dataType + '取得エラー: ' + error.toString());
        throw error;
      }
    });
    
    // 結果を統合
    var allData = [];
    var totalDataCount = 0;
    
    processResult.results.forEach(function(result) {
      allData = allData.concat(result.data);
      totalDataCount += result.dataCount;
    });
    
    // データ書き込み
    if (allData.length > 0) {
      processor.batchWrite(sheet, allData, 6, 1);
    }
    
    return {
      successCount: processResult.successCount,
      totalCount: municipalities.length,
      dataCount: totalDataCount,
      errors: processResult.errors
    };
  }
};

/**
 * 受信箱管理サービス
 */
var MessageBoxService = {
  
  /**
   * 受信箱データの取得・更新
   * @return {Object} 処理結果
   */
  fetchAndUpdateMessageBoxes: function() {
    // APIからメッセージボックス一覧を取得
    var messageBoxes = RelationApiService.fetchMessageBoxes();
    
    // シート準備
    var sheet = this._prepareMessageBoxSheet();
    
    // コード表データを事前読み込み
    var codeTableMap = this._loadCodeTableMap();
    
    // 進捗管理
    var progressCell = sheet.getRange(getConstant('PROGRESS.CELL_POSITION'));
    
    // バッチプロセッサ作成
    var processor = createBatchProcessor({
      batchSize: getConstant('BATCH_SIZE'),
      waitTime: getConstant('RATE_LIMIT_WAIT'),
      progressCell: progressCell,
      progressPrefix: 'メッセージボックス処理'
    });
    
    // 各メッセージボックスを処理
    var self = this;
    var processResult = processor.process(messageBoxes, function(messageBox, index) {
      return self._processMessageBox(sheet, messageBox, codeTableMap);
    });
    
    // 結果集計
    var foundCodeCount = processResult.results.filter(function(result) {
      return result.codeFound;
    }).length;
    
    return {
      successCount: processResult.successCount,
      totalCount: messageBoxes.length,
      dataCount: foundCodeCount,
      errors: processResult.errors
    };
  },
  
  /**
   * 受信箱シート準備（内部メソッド）
   * @return {Sheet} 準備されたシート
   */
  _prepareMessageBoxSheet: function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName(getSheetName('MESSAGE_BOXES'));

    if (!configSheet) {
      console.log('受信箱シートが見つかりません。新規作成します。');
      createMunicipalityConfigSheet();
      configSheet = ss.getSheetByName(getSheetName('MESSAGE_BOXES'));
    }
    
    ss.setActiveSheet(configSheet);
    configSheet.getRange('A1').setValue('📮受信箱');
    
    this._ensureCorrectHeaders(configSheet);
    
    return configSheet;
  },
  
  /**
   * ヘッダー確認・設定（内部メソッド）
   * @param {Sheet} configSheet 設定シート
   */
  _ensureCorrectHeaders: function(configSheet) {
    var data = configSheet.getDataRange().getValues();
    var headers = data.length > 4 ? data[4] : [];
    
    if (headers.length < 4 || headers[1] !== '自治体名' || headers[3] !== '受信箱ID') {
      console.log('受信箱シートのヘッダーを確認・修正します。');
      var correctHeaders = getHeaders('MESSAGE_BOXES');
      configSheet.getRange(5, 1, 1, correctHeaders.length).setValues([correctHeaders]);
    }
  },
  
  /**
   * コード表データ読み込み（内部メソッド）
   * @return {Array} コード表データ
   */
  _loadCodeTableMap: function() {
    return wrapWithErrorHandling(function() {
      return loadCodeTableMap();
    }, 'コード表読み込み', 'コード表の読み込みに失敗しました', {
      defaultReturn: []
    })();
  },
  
  /**
   * 単一メッセージボックス処理（内部メソッド）
   * @param {Sheet} sheet 対象シート
   * @param {Object} messageBox メッセージボックス
   * @param {Array} codeTableMap コード表データ
   * @return {Object} 処理結果
   */
  _processMessageBox: function(sheet, messageBox, codeTableMap) {
    var municipalityName = messageBox.name;
    var codeInfo = findMunicipalityInCodeTable(municipalityName, codeTableMap);
    
    // 既存データの確認と更新
    var data = sheet.getDataRange().getValues();
    var rowIndex = this._findOrCreateRowForMessageBox(sheet, messageBox.message_box_id, data.length);
    
    // 自治体データを更新
    this._updateMunicipalityRow(sheet, rowIndex, messageBox, codeInfo);
    
    console.log('処理完了: ' + municipalityName);
    
    return {
      messageBoxId: messageBox.message_box_id,
      municipalityName: municipalityName,
      codeFound: !!codeInfo.code
    };
  },
  
  /**
   * メッセージボックス行の検索・作成（内部メソッド）
   * @param {Sheet} sheet 対象シート
   * @param {string} messageBoxId メッセージボックスID
   * @param {number} dataLength データ長
   * @return {number} 行インデックス
   */
  _findOrCreateRowForMessageBox: function(sheet, messageBoxId, dataLength) {
    var data = sheet.getDataRange().getValues();
    
    // 既存行を検索
    for (var i = 5; i < data.length; i++) {
      if (data[i][getColumnIndex('MESSAGE_BOXES', 'MESSAGE_BOX_ID')] === messageBoxId) {
        return i + 1;
      }
    }
    
    // 新しい行を追加
    var newRowIndex = data.length + 1;
    if (newRowIndex > dataLength) {
      sheet.appendRow(['', '', '', '', '', '', '']);
    }
    
    return newRowIndex;
  },
  
  /**
   * 自治体行データ更新（内部メソッド）
   * @param {Sheet} sheet 対象シート
   * @param {number} rowIndex 行インデックス
   * @param {Object} messageBox メッセージボックス
   * @param {Object} codeInfo コード情報
   */
  _updateMunicipalityRow: function(sheet, rowIndex, messageBox, codeInfo) {
    var municipalityName = messageBox.name;
    
    // 各列を更新
    if (codeInfo.code) {
      sheet.getRange(rowIndex, getColumnIndex('MESSAGE_BOXES', 'MUNICIPALITY_ID') + 1).setValue(codeInfo.code);
    } else {
      sheet.getRange(rowIndex, getColumnIndex('MESSAGE_BOXES', 'MUNICIPALITY_ID') + 1).setValue('');
    }
    
    sheet.getRange(rowIndex, getColumnIndex('MESSAGE_BOXES', 'MUNICIPALITY_NAME') + 1).setValue(municipalityName);
    
    if (codeInfo.prefecture) {
      sheet.getRange(rowIndex, getColumnIndex('MESSAGE_BOXES', 'PREFECTURE') + 1).setValue(codeInfo.prefecture);
    }
    
    sheet.getRange(rowIndex, getColumnIndex('MESSAGE_BOXES', 'MESSAGE_BOX_ID') + 1).setValue(messageBox.message_box_id);
    
    // リンク設定
    var messageBoxUrl = getRelationBaseUrl() + '/tickets/#/' + messageBox.message_box_id + '/tickets/open/p1';
    var richText = SpreadsheetApp.newRichTextValue()
      .setText(municipalityName)
      .setLinkUrl(messageBoxUrl)
      .build();
    
    sheet.getRange(rowIndex, getColumnIndex('MESSAGE_BOXES', 'MUNICIPALITY_NAME') + 1).setRichTextValue(richText);
  }
};
