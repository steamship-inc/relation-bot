/**
 * 手動Slack送信関数
 * 選択した自治体の📊openTicketシートのチケットを手動送信
 */
function manualSendSlack() {
  var ui = SpreadsheetApp.getUi();
  
  try {
    // Bot Tokenの確認
    var slackBotToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
    
    if (!slackBotToken) {
      ui.alert('エラー', 'SLACK_BOT_TOKENが設定されていません。スクリプトプロパティに設定してください。', ui.ButtonSet.OK);
      return;
    }

    // 📊openTicketシートの存在確認
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var openTicketSheet = ss.getSheetByName('📊openTicket');
    
    if (!openTicketSheet) {
      ui.alert('エラー', 
               '📊openTicketシートが見つかりません。\n' +
               '先に「🟩 re:lation」→「全自治体 openチケット取得」を実行してください。', 
               ui.ButtonSet.OK);
      return;
    }

    // 全自治体設定を取得
    var configs = getAllMunicipalityConfigs();
    var municipalityList = [];
    
    // 自治体リストを作成
    for (var id in configs) {
      municipalityList.push(configs[id].name + ' (' + configs[id].slackChannel + ')');
    }
    
    if (municipalityList.length === 0) {
      ui.alert('エラー', '受信箱設定が見つかりません。設定シートを確認してください。', ui.ButtonSet.OK);
      return;
    }
    
    // 自治体選択ダイアログ（検索可能セレクトボックス）
    var selectedConfig = selectMunicipalityWithSearchableDialog(configs);
    
    if (!selectedConfig) {
      console.log('手動送信がキャンセルされました');
      return;
    }
    
    // 📊openTicketシートから該当自治体のチケットを取得
    console.log('=== ' + selectedConfig.name + 'のopenチケット取得開始（シートから） ===');
    var tickets = getTicketsFromSheet(selectedConfig.name);
    
    if (!tickets || tickets.length === 0) {
      ui.alert('通知なし', 
               '「' + selectedConfig.name + '」のopenチケットが📊openTicketシートに見つかりません。\n' +
               '最新データを取得するため「🟩 re:lation」→「全自治体 openチケット取得」を実行してください。', 
               ui.ButtonSet.OK);
      return;
    }
    
    // 確認ダイアログ
    var confirmResult = ui.alert('手動送信確認', 
                                '「' + selectedConfig.name + '」のopenチケット ' + tickets.length + '件を\n' +
                                '送信先: ' + selectedConfig.slackChannel + '\n\n' +
                                '手動送信しますか？', 
                                ui.ButtonSet.YES_NO);
    
    if (confirmResult !== ui.Button.YES) {
      console.log('手動送信がキャンセルされました');
      return;
    }
    
    // 実際のチケットで通知送信
    console.log('=== Slack手動送信開始 ===');
    console.log('対象自治体: ' + selectedConfig.name);
    console.log('チケット件数: ' + tickets.length);
    console.log('送信先: ' + selectedConfig.slackChannel);
    
    var sendResult = sendSlack(tickets, selectedConfig);
    
    // 送信結果に応じて適切なメッセージを表示
    if (sendResult && sendResult.success) {
      ui.alert('送信完了', 
               '「' + selectedConfig.name + '」のopenチケット ' + tickets.length + '件の送信に成功しました。\n' +
               '送信先: ' + selectedConfig.slackChannel, 
               ui.ButtonSet.OK);
    } else {
      // 送信失敗の詳細を表示
      var errorMessage = '「' + selectedConfig.name + '」のSlack通知送信に失敗しました。\n\n';
      errorMessage += '送信先: ' + selectedConfig.slackChannel + '\n';
      
      if (sendResult && sendResult.error) {
        errorMessage += 'エラー詳細: ' + sendResult.error + '\n';
        if (sendResult.errorResponse) {
          errorMessage += 'Slack APIレスポンス: ' + JSON.stringify(sendResult.errorResponse) + '\n';
        }
      }
      
      errorMessage += '\n対処方法:\n';
      errorMessage += '1) ボットがチャンネルに招待されているか確認\n';
      errorMessage += '2) チャンネル名が正確か確認\n';
      errorMessage += '3) Bot Tokenが有効か確認';
      
      ui.alert('送信失敗', errorMessage, ui.ButtonSet.OK);
      
      console.error('=== Slack送信失敗詳細 ===');
      console.error('自治体: ' + selectedConfig.name);
      console.error('送信先: ' + selectedConfig.slackChannel);
      if (sendResult) {
        console.error('エラー: ' + (sendResult.error || '不明'));
        console.error('レスポンス: ' + JSON.stringify(sendResult.errorResponse || {}));
      }
    }
             
  } catch (error) {
    console.error('Slack手動送信エラー: ' + error.toString());
    ui.alert('エラー', 'Slack手動送信に失敗しました: ' + error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * 📊openTicketシートから指定自治体のチケット情報を取得
 * @param {string} municipalityName 自治体名
 * @return {Array} チケット配列
 */
function getTicketsFromSheet(municipalityName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('📊openTicket');
    
    if (!sheet) {
      console.log('📊openTicketシートが見つかりません');
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      console.log('📊openTicketシートにデータがありません');
      return [];
    }
    
    // ヘッダー行を確認（想定: ['自治体名', 'ID', 'タイトル', 'ステータス', '作成日', '更新日', 'チケット分類ID', 'ラベルID', '保留理由ID']）
    var headers = data[0];
    console.log('シートヘッダー: ' + headers.join(', '));
    
    var tickets = [];
    
    // データ行をループして該当自治体のチケットを抽出
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      
      // 自治体名が一致するかチェック
      if (row[0] === municipalityName) {
        var ticket = {
          ticket_id: row[1],
          title: row[2] || '',
          status_cd: row[3] || 'open',
          created_at: row[4] || '',
          last_updated_at: row[5] || '',
          case_category_ids: parseIds(row[6]),
          label_ids: parseIds(row[7]),
          pending_reason_id: row[8] || null
        };
        
        tickets.push(ticket);
      }
    }
    
    console.log(municipalityName + 'のチケット件数（シートから）: ' + tickets.length);
    return tickets;
    
  } catch (error) {
    console.error('シートからのチケット取得エラー: ' + error.toString());
    return [];
  }
}

/**
 * ID文字列をパースして配列に変換
 * @param {string} idsString カンマ区切りのID文字列
 * @return {Array} ID配列
 */
function parseIds(idsString) {
  if (!idsString || idsString === '') {
    return [];
  }
  
  try {
    // カンマ区切りの文字列を配列に変換
    return idsString.toString().split(',').map(function(id) {
      return parseInt(id.trim());
    }).filter(function(id) {
      return !isNaN(id);
    });
  } catch (error) {
    console.error('ID解析エラー: ' + error.toString());
    return [];
  }
}

/**
 * 検索可能なHTMLダイアログで自治体を選択
 * @param {Object} configs 全自治体設定
 * @return {Object|null} 選択された自治体設定
 */
function selectMunicipalityWithSearchableDialog(configs) {
  try {
    var configIds = Object.keys(configs);
    
    // 自治体リストのHTMLを事前に生成
    var municipalityItemsHtml = '';
    for (var i = 0; i < configIds.length; i++) {
      var config = configs[configIds[i]];
      municipalityItemsHtml += '<div class="municipality-item" onclick="selectMunicipality(\'' + configIds[i] + '\')" data-id="' + configIds[i] + '">';
      municipalityItemsHtml += '<div class="municipality-name">' + config.name + '</div>';
      municipalityItemsHtml += '<div class="municipality-channel">' + config.slackChannel + '</div>';
      municipalityItemsHtml += '</div>';
    }

    var htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>自治体選択</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              margin: 0;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
            }
            h2 {
              color: #333;
              margin-bottom: 20px;
            }
            .search-box {
              width: 100%;
              padding: 10px;
              font-size: 16px;
              border: 2px solid #ddd;
              border-radius: 5px;
              margin-bottom: 15px;
              box-sizing: border-box;
            }
            .municipality-list {
              max-height: 300px;
              overflow-y: auto;
              border: 1px solid #ddd;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .municipality-item {
              padding: 12px 15px;
              border-bottom: 1px solid #eee;
              cursor: pointer;
              transition: background-color 0.2s;
              display: block;
            }
            .municipality-item:hover {
              background-color: #f5f5f5;
            }
            .municipality-item:last-child {
              border-bottom: none;
            }
            .municipality-name {
              font-weight: bold;
              color: #333;
            }
            .municipality-channel {
              color: #666;
              font-size: 14px;
              margin-top: 3px;
            }
            .buttons {
              text-align: center;
            }
            .btn {
              padding: 10px 20px;
              margin: 5px;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
            }
            .btn-primary {
              background-color: #4CAF50;
              color: white;
            }
            .btn-secondary {
              background-color: #f44336;
              color: white;
            }
            .btn:hover {
              opacity: 0.8;
            }
            .selected {
              background-color: #e3f2fd !important;
              border-left: 4px solid #2196F3;
            }
            .no-results {
              padding: 20px;
              text-align: center;
              color: #666;
              font-style: italic;
            }
            .hidden {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>🏛️ 自治体選択 - 手動送信</h2>
            <input 
              type="text" 
              id="searchBox" 
              class="search-box" 
              placeholder="自治体名で検索（例：山鹿、札幌）..." 
              oninput="filterMunicipalities()"
            >
            <div id="municipalityList" class="municipality-list">
              ${municipalityItemsHtml}
            </div>
            <div class="buttons">
              <button class="btn btn-primary" onclick="confirmSelection()" id="confirmBtn" disabled>
                選択した自治体に送信
              </button>
              <button class="btn btn-secondary" onclick="google.script.host.close()">
                キャンセル
              </button>
            </div>
          </div>

          <script>
            var selectedMunicipalityCode = null;
            var configs = ${JSON.stringify(configs)};

            function filterMunicipalities() {
              var searchTerm = document.getElementById('searchBox').value.toLowerCase();
              var items = document.querySelectorAll('.municipality-item');
              var noResultsMsg = document.querySelector('.no-results');
              var hasResults = false;

              // 既存の「検索結果なし」メッセージを削除
              if (noResultsMsg) {
                noResultsMsg.remove();
              }

              items.forEach(function(item) {
                var name = item.querySelector('.municipality-name').textContent.toLowerCase();
                var channel = item.querySelector('.municipality-channel').textContent.toLowerCase();
                
                if (searchTerm === '' || name.includes(searchTerm) || channel.includes(searchTerm)) {
                  item.classList.remove('hidden');
                  hasResults = true;
                } else {
                  item.classList.add('hidden');
                }
              });

              // 検索結果がない場合のメッセージ表示
              if (!hasResults && searchTerm !== '') {
                var msg = document.createElement('div');
                msg.className = 'no-results';
                msg.textContent = '「' + searchTerm + '」に一致する自治体が見つかりません';
                document.getElementById('municipalityList').appendChild(msg);
              }
            }

            function selectMunicipality(municipalityId) {
              // 既存の選択を解除
              document.querySelectorAll('.municipality-item').forEach(function(item) {
                item.classList.remove('selected');
              });

              // 新しい選択を設定
              var selectedItem = document.querySelector('[data-id="' + municipalityId + '"]');
              if (selectedItem && !selectedItem.classList.contains('hidden')) {
                selectedItem.classList.add('selected');
                selectedMunicipalityCode = municipalityId;
                document.getElementById('confirmBtn').disabled = false;
                
                // 選択された自治体名を表示
                var municipalityName = configs[municipalityId].name;
                document.getElementById('confirmBtn').textContent = '「' + municipalityName + '」に送信';
              }
            }

            function confirmSelection() {
              if (selectedMunicipalityCode) {
                google.script.run
                  .withSuccessHandler(function() {
                    google.script.host.close();
                  })
                  .setSelectedMunicipality(selectedMunicipalityCode);
              }
            }

            // エンターキーで検索結果が1つの場合は自動選択
            document.getElementById('searchBox').addEventListener('keypress', function(e) {
              if (e.key === 'Enter') {
                var visibleItems = document.querySelectorAll('.municipality-item:not(.hidden)');
                if (visibleItems.length === 1) {
                  var municipalityId = visibleItems[0].getAttribute('data-id');
                  selectMunicipality(municipalityId);
                  confirmSelection();
                }
              }
            });

            // 初期フォーカス
            document.getElementById('searchBox').focus();
          </script>
        </body>
      </html>
    `;
    
    var htmlOutput = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(600)
      .setHeight(500);
    
    // 選択結果を保存するためのプロパティをリセット
    PropertiesService.getScriptProperties().deleteProperty('selectedMunicipalityCode');
    
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, '自治体選択');
    
    // ダイアログが閉じられるまで待機（簡易的な実装）
    Utilities.sleep(1000);
    
    // 最大30秒間、選択結果を待機
    for (var i = 0; i < 30; i++) {
      var selectedId = PropertiesService.getScriptProperties().getProperty('selectedMunicipalityCode');
      if (selectedId) {
        PropertiesService.getScriptProperties().deleteProperty('selectedMunicipalityCode');
        return configs[selectedId] || null;
      }
      Utilities.sleep(1000);
    }
    
    return null;
  } catch (error) {
    console.error('検索可能ダイアログエラー: ' + error.toString());
    // フォールバック：シンプルな選択方式
    return selectMunicipalityWithSimplePrompt(configs);
  }
}

/**
 * HTMLダイアログからの選択結果を受け取る
 * @param {string} municipalityCode 選択された自治体コード
 */
function setSelectedMunicipality(municipalityCode) {
  PropertiesService.getScriptProperties().setProperty('selectedMunicipalityCode', municipalityCode);
}

/**
 * フォールバック：シンプルなプロンプト選択
 * @param {Object} configs 全自治体設定
 * @return {Object|null} 選択された自治体設定
 */
function selectMunicipalityWithSimplePrompt(configs) {
  var ui = SpreadsheetApp.getUi();
  var configIds = Object.keys(configs);
  
  var options = [];
  for (var i = 0; i < configIds.length; i++) {
    var config = configs[configIds[i]];
    options.push((i + 1) + '. ' + config.name + ' (' + config.slackChannel + ')');
  }
  
  var optionsText = options.join('\\n');
  var response = ui.prompt(
    '自治体選択',
    '手動送信する自治体を選択してください:\\n\\n' + optionsText + '\\n\\n番号を入力してください (1-' + configIds.length + '):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    var input = response.getResponseText();
    var selectedNumber = parseInt(input);
    
    if (selectedNumber >= 1 && selectedNumber <= configIds.length) {
      var selectedId = configIds[selectedNumber - 1];
      return configs[selectedId];
    }
  }
  
  return null;
}


/**
 * Slack通知を送信する関数
 * @param {Array} tickets チケット配列
 * @param {Object} config 自治体設定オブジェクト（オプション）
 */
function sendSlack(tickets, config) {
  // Bot Tokenを取得
  var slackBotToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
  
  if (!slackBotToken) {
    console.log('SLACK_BOT_TOKENが設定されていません。スクリプトプロパティに設定してください。');
    return {
      success: false,
      message: 'SLACK_BOT_TOKENが設定されていません。スクリプトプロパティに設定してください。',
      error: 'token_not_configured'
    };
  }

  // 設定が渡されていない場合はエラー
  if (!config) {
    console.log('自治体設定が指定されていません');
    return {
      success: false,
      message: '自治体設定が指定されていません',
      error: 'config_not_provided'
    };
  }
  
  console.log('Bot Token使用: ' + config.slackChannel + ' に送信');
  return sendWithBotToken(tickets, config, slackBotToken);
}

/**
 * Bot Tokenを使用してSlack送信
 */
function sendWithBotToken(tickets, config, botToken) {
  var message = createSlackMessage(tickets, config);
  
  console.log('=== Slack送信デバッグ ===');
  console.log('送信先チャンネル: ' + config.slackChannel);
  console.log('メッセージ内容: ' + message);
  console.log('Bot Token長さ: ' + (botToken ? botToken.length : 'なし'));
  console.log('Bot Token開始文字: ' + (botToken ? botToken.substring(0, 10) + '...' : 'なし'));
  
  // チャンネル名をそのまま使用（#付きも対応）
  var channelName = config.slackChannel;
  
  // 送信先の種類を判定してログ出力
  var channelType = '';
  if (channelName.startsWith('U')) {
    channelType = 'ユーザーID（DM送信）';
  } else if (channelName.startsWith('C')) {
    channelType = 'チャンネルID';
  } else if (channelName.startsWith('D')) {
    channelType = 'DMチャンネルID';
  } else if (channelName.startsWith('G')) {
    channelType = 'グループDMチャンネルID';
  } else if (channelName.startsWith('#')) {
    channelType = 'チャンネル名（#付き）';
  } else {
    // 日本語チャンネル名の場合の処理
    var hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(channelName);
    if (hasJapanese) {
      channelType = '日本語チャンネル名';
    } else {
      channelType = '英語チャンネル名';
    }
  }
  
  console.log('送信先タイプ: ' + channelType);
  console.log('送信先値: "' + channelName + '"');
  console.log('送信先文字数: ' + channelName.length);
  
  // チャンネル名をそのまま使用して送信
  var result = attemptSlackSend(channelName, message, botToken, channelType);
  
  return result;
}

/**
 * Slack送信を試行する内部関数
 * @param {string} channel チャンネル名
 * @param {string} message メッセージ
 * @param {string} botToken ボットトークン
 * @param {string} description 試行の説明
 * @return {boolean} 送信成功かどうか
 */
function attemptSlackSend(channel, message, botToken, description) {
  console.log('=== attemptSlackSend デバッグ開始 ===');
  console.log('チャンネル: "' + channel + '"');
  console.log('説明: ' + description);
  console.log('メッセージ長: ' + message.length);
  console.log('ボットトークン存在: ' + (botToken ? 'あり' : 'なし'));
  
  var payload = {
    channel: channel,
    text: message
  };
  
  console.log('送信ペイロード: ' + JSON.stringify(payload));

  try {
    console.log('Slack API呼び出し開始...');
    var response = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + botToken,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    });
    
    console.log('Slack API レスポンス受信完了');
    console.log('レスポンス ステータス: ' + response.getResponseCode());
    console.log('レスポンス ヘッダー: ' + JSON.stringify(response.getHeaders()));
    
    var result = JSON.parse(response.getContentText());
    console.log('Slack API レスポンス (' + description + '): ' + JSON.stringify(result));
    
    if (result.ok) {
      console.log('✅ Slack通知送信成功（' + description + ' - 送信先: ' + channel + '）');
      return {
        success: true,
        message: 'Slack通知送信成功',
        details: result
      };
    } else {
      console.error('Bot Token送信エラー: ' + result.error);
      var errorMessage = 'Slack送信エラー: ' + result.error;
      
      // エラーに応じた詳細メッセージを追加
      if (result.error === 'not_in_channel') {
        errorMessage += '\n\n対処法: ボットをチャンネルに招待してください。\n1. Slackでチャンネルを開く\n2. /invite @re:lation Bot を実行\n3. またはチャンネル設定からメンバーに追加';
      } else if (result.error === 'channel_not_found') {
        errorMessage += '\n\n対処法: チャンネル名を確認してください。\n- チャンネル名は正確に入力してください\n- プライベートチャンネルの場合は、ボットが招待されている必要があります';
      } else if (result.error === 'invalid_auth') {
        errorMessage += '\n\n対処法: Bot Tokenを確認してください。\n- スクリプトプロパティのSLACK_BOT_TOKENが正しく設定されているか確認\n- Tokenの有効期限が切れていないか確認';
      }
      
      return {
        success: false,
        message: errorMessage,
        error: result.error,
        details: result
      };
    }
  } catch (error) {
    console.error('Bot Token送信失敗: ' + error.toString());
    return {
      success: false,
      message: 'Slack API呼び出しでエラーが発生しました: ' + error.toString(),
      error: 'api_call_failed',
      details: { error: error.toString() }
    };
  }
}

/**
 * レート制限を考慮したSlack通知送信（60自治体対応）
 * @param {Array} tickets チケット配列
 * @param {Object} config 自治体設定
 * @param {boolean} isLast 最後の送信かどうか
 */
function sendSlackWithRateLimit(tickets, config, isLast) {
  sendSlack(tickets, config);
  
  // 最後の送信でない場合は待機
  if (!isLast) {
    // Webhook: 1.1秒間隔（安全マージン込み）
    // Bot Token: 1.5秒間隔（40回/分 = 安全）
    Utilities.sleep(1500); // 1.5秒待機
  }
}

/**
 * Slackメッセージを作成する関数
 * @param {Array} tickets チケット配列
 * @param {Object} config 自治体設定オブジェクト
 * @return {string} Slack用のフォーマットされたメッセージ
 */
function createSlackMessage(tickets, config) {
  var totalCount = tickets.length;
  var messageBoxId = config.messageBoxId;
  
  // 自治体設定からSlack通知テンプレートを取得
  var template = getSlackMessageTemplate(config);
  
  if (totalCount === 0) {
    return template.noTicketsMessage.replace('{municipalityName}', config.name);
  }
  
  var message = template.headerTemplate
    .replace('{municipalityName}', config.name)
    .replace('{totalCount}', totalCount);
  
  // 上位指定件数のチケットを詳細表示
  var displayCount = Math.min(totalCount, template.maxDisplayCount || 5);
  message += template.ticketListHeader.replace('{displayCount}', displayCount);
  
  for (var i = 0; i < displayCount; i++) {
    var ticket = tickets[i];
    var ticketUrl = buildTicketUrl(messageBoxId, ticket.ticket_id, 'open');
    
    var ticketLine = template.ticketItemTemplate
      .replace('{ticketUrl}', ticketUrl)
      .replace('{ticketId}', ticket.ticket_id)
      .replace('{title}', ticket.title)
      .replace('{createdAt}', formatDate(ticket.created_at))
      .replace('{updatedAt}', formatDate(ticket.last_updated_at));
    
    message += ticketLine;
  }
  
  if (totalCount > (template.maxDisplayCount || 5)) {
    var remaining = totalCount - (template.maxDisplayCount || 5);
    message += template.remainingTicketsMessage.replace('{remainingCount}', remaining);
  }
  
  message += template.footerMessage;
  
  return message;
}

/**
 * 自治体設定からSlack通知テンプレートを取得する関数
 * @param {Object} config 自治体設定オブジェクト
 * @return {Object} Slack通知テンプレート
 */
function getSlackMessageTemplate(config) {
  // デフォルトテンプレート
  var defaultTemplate = {
    headerTemplate: '🎫 *{municipalityName} - 未対応チケット状況報告*\n\n📊 未対応チケット数: *{totalCount}件*\n\n',
    ticketListHeader: '📋 *最新チケット（上位{displayCount}件）:*\n',
    ticketItemTemplate: '• <{ticketUrl}|#{ticketId}> {title}\n  作成: {createdAt} | 更新: {updatedAt}\n',
    remainingTicketsMessage: '\n... 他 {remainingCount}件のチケットがあります\n',
    footerMessage: '\n💡 詳細はスプレッドシートをご確認ください',
    noTicketsMessage: '✅ {municipalityName} - 未対応チケットはありません！',
    maxDisplayCount: 5
  };
  
  // 自治体設定にSlack通知テンプレートが設定されている場合は使用
  if (config.slackTemplate) {
    try {
      var customTemplate = JSON.parse(config.slackTemplate);
      // デフォルト値とマージ
      return Object.assign(defaultTemplate, customTemplate);
    } catch (error) {
      console.error('Slack通知テンプレートのJSON解析に失敗しました: ' + error.toString());
      console.log('デフォルトテンプレートを使用します');
    }
  }
  
  return defaultTemplate;
}

/**
 * 日時をフォーマットする関数
 * @param {string} isoString ISO8601形式の日時文字列
 * @return {string} フォーマットされた日時文字列 (MM/dd HH:mm)
 */
function formatDate(isoString) {
  var date = new Date(isoString);
  return Utilities.formatDate(date, 'Asia/Tokyo', 'MM/dd HH:mm');
}

/**
 * チケット詳細URLを生成
 * @param {string} messageBoxId 受信箱ID
 * @param {string} ticketId チケットID
 * @param {string} status チケットステータス（'open' または 'closed'）
 * @return {string} チケット詳細URL
 */
function buildTicketUrl(messageBoxId, ticketId, status) {
  status = status || 'open';
  var RELATION_BASE_URL = 'https://steamship.relation.biz';
  return RELATION_BASE_URL + '/tickets/#/' + messageBoxId + '/tickets/' + status + '/p1/' + ticketId + '?order=desc&order_by';
}
