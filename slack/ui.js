/**
 * Slack通知用ユーザーインターフェースモジュール
 * 自治体選択ダイアログとユーザー操作を担当
 */

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
            .progress-container {
              text-align: center;
              padding: 20px;
              max-width: 500px;
              margin: 0 auto;
            }
            .progress-header h2 {
              color: #333;
              margin-bottom: 30px;
            }
            .progress-steps {
              text-align: left;
              margin: 20px 0;
            }
            .progress-step {
              display: flex;
              align-items: center;
              padding: 12px 15px;
              margin-bottom: 10px;
              border: 1px solid #ddd;
              border-radius: 5px;
              background-color: #f9f9f9;
              transition: all 0.3s ease;
            }
            .progress-step.completed {
              background-color: #e8f5e8;
              border-color: #4CAF50;
            }
            .progress-step.skipped {
              background-color: #f0f0f0;
              border-color: #999;
            }
            .progress-step.error {
              background-color: #ffeaea;
              border-color: #f44336;
            }
            .step-icon {
              font-size: 20px;
              margin-right: 15px;
              min-width: 30px;
            }
            .step-text {
              flex: 1;
              font-weight: bold;
              color: #333;
            }
            .step-time {
              font-size: 12px;
              color: #666;
              font-style: italic;
            }
            .progress-result {
              margin-top: 20px;
              padding: 15px;
              border-radius: 5px;
              font-weight: bold;
              font-size: 16px;
            }
            .progress-result.success {
              background-color: #e8f5e8;
              color: #4CAF50;
              border: 1px solid #4CAF50;
            }
            .progress-result.skipped {
              background-color: #f0f0f0;
              color: #666;
              border: 1px solid #999;
            }
            .progress-result.error {
              background-color: #ffeaea;
              color: #f44336;
              border: 1px solid #f44336;
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
                // ボタンを無効化して重複実行を防止
                var confirmBtn = document.getElementById('confirmBtn');
                confirmBtn.disabled = true;
                
                // 進捗表示エリアを作成
                showProgressDialog(configs[selectedMunicipalityCode].name);
                
                // 選択結果を直接渡してダイアログを閉じる
                setTimeout(function() { updateProgress('config', 'success'); }, 500);
                setTimeout(function() { updateProgress('tickets', 'success'); }, 1000);
                setTimeout(function() { updateProgress('message', 'success'); }, 1200);
                setTimeout(function() { updateProgress('slack', 'success'); }, 1500);
                
                google.script.run
                  .withSuccessHandler(function() {
                    updateProgress('✅ 送信完了', 'success');
                    setTimeout(function() {
                      google.script.host.close();
                    }, 2000);
                  })
                  .withFailureHandler(function(error) {
                    console.error('処理エラー:', error);
                    updateProgress('❌ エラー: ' + error, 'error');
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = '「' + configs[selectedMunicipalityCode].name + '」に送信';
                    setTimeout(function() {
                      hideProgressDialog();
                    }, 3000);
                  })
                  .processSelectedMunicipality(selectedMunicipalityCode);
              }
            }

            function showProgressDialog(municipalityName) {
              // 既存のコンテナを隠す
              document.querySelector('.container').style.display = 'none';
              
              // 進捗表示エリアを作成
              var progressContainer = document.createElement('div');
              progressContainer.id = 'progressContainer';
              progressContainer.className = 'progress-container';
              progressContainer.innerHTML = 
                '<div class="progress-header">' +
                  '<h2>🚀 「' + municipalityName + '」への送信中</h2>' +
                '</div>' +
                '<div class="progress-steps">' +
                  '<div class="progress-step" id="step1">' +
                    '<div class="step-icon">⏳</div>' +
                    '<div class="step-text">自治体設定を取得中...</div>' +
                    '<div class="step-time">0.1〜0.3秒</div>' +
                  '</div>' +
                  '<div class="progress-step" id="step2">' +
                    '<div class="step-icon">⏳</div>' +
                    '<div class="step-text">チケットデータを抽出中...</div>' +
                    '<div class="step-time">0.1〜0.5秒</div>' +
                  '</div>' +
                  '<div class="progress-step" id="step3">' +
                    '<div class="step-icon">⏳</div>' +
                    '<div class="step-text">Slackメッセージを作成中...</div>' +
                    '<div class="step-time">0.01〜0.05秒</div>' +
                  '</div>' +
                  '<div class="progress-step" id="step4">' +
                    '<div class="step-icon">⏳</div>' +
                    '<div class="step-text">Slack APIに送信中...</div>' +
                    '<div class="step-time">0.5〜3秒</div>' +
                  '</div>' +
                '</div>' +
                '<div class="progress-result" id="progressResult"></div>';
              
              document.body.appendChild(progressContainer);
            }

            function updateProgress(step, status, message) {
              var stepMap = {
                'config': 'step1',
                'tickets': 'step2', 
                'message': 'step3',
                'slack': 'step4'
              };
              
              if (stepMap[step]) {
                var stepElement = document.getElementById(stepMap[step]);
                var icon = stepElement.querySelector('.step-icon');
                var text = stepElement.querySelector('.step-text');
                
                if (status === 'success') {
                  icon.textContent = '✅';
                  stepElement.classList.add('completed');
                } else if (status === 'skipped') {
                  icon.textContent = '⏭️';
                  stepElement.classList.add('skipped');
                } else if (status === 'error') {
                  icon.textContent = '❌';
                  stepElement.classList.add('error');
                }
                
                if (message) {
                  text.textContent = message;
                }
              } else {
                // 最終結果の表示
                var resultElement = document.getElementById('progressResult');
                resultElement.textContent = step;
                resultElement.className = 'progress-result ' + status;
              }
            }

            function hideProgressDialog() {
              var progressContainer = document.getElementById('progressContainer');
              if (progressContainer) {
                progressContainer.remove();
              }
              document.querySelector('.container').style.display = 'block';
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
    
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, '自治体選択');
    
    console.log('ダイアログ表示完了');
    
    // ダイアログの結果を待つ必要なし - processSelectedMunicipality が直接処理する
    return null; // この戻り値は使われない
  } catch (error) {
    console.error('検索可能ダイアログエラー: ' + error.toString());
    // フォールバック：シンプルな選択方式
    return selectMunicipalityWithSimplePrompt(configs);
  }
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
