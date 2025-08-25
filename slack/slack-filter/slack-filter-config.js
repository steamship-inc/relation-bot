/**
 * Slack通知フィルタ設定支援モジュール
 * エンジニア以外でも簡単にフィルタ条件を設定できるヘルパー機能
 */

/**
 * フィルタ設定用UIを表示する関数
 * 📮受信箱シートのG列に設定するJSON文字列を生成
 */
function showFilterConfigDialog() {
  // 全自治体の設定を取得
  var configs = loadMunicipalityConfigFromSheet(true);
  
  if (Object.keys(configs).length === 0) {
    SpreadsheetApp.getUi().alert('エラー', '自治体設定が見つかりません。先に「📮 受信箱取得」を実行してください。', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  // 自治体選択用HTMLダイアログを表示
  showMunicipalitySelectionDialog(configs);
}

/**
 * 自治体選択用HTMLダイアログを表示
 * @param {Object} configs 全自治体設定
 */
function showMunicipalitySelectionDialog(configs) {
  var htmlTemplate = HtmlService.createTemplate(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 30px;
            background-color: #f8f9fa;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            padding-bottom: 100px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h2 { 
            color: #333; 
            text-align: center;
            margin-bottom: 30px;
          }
          .search-container {
            position: relative;
            margin-bottom: 20px;
          }
          #municipalitySearch {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            box-sizing: border-box;
          }
          #municipalitySearch:focus {
            outline: none;
            border-color: #4CAF50;
          }
          .municipality-list {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: white;
          }
          .municipality-item {
            padding: 12px 15px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
            transition: background-color 0.2s;
          }
          .municipality-item:hover {
            background-color: #f0f8ff;
          }
          .municipality-item:last-child {
            border-bottom: none;
          }
          .municipality-item.selected {
            background-color: #e7f3ff;
            border-left: 4px solid #4CAF50;
          }
          .municipality-name {
            font-weight: bold;
            color: #333;
          }
          .municipality-id {
            color: #666;
            font-size: 12px;
            margin-top: 4px;
          }
          .button-group {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            border-top: 1px solid #ddd;
            padding: 15px;
            text-align: center;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
          }
          button {
            margin: 0 10px;
            padding: 12px 25px;
            font-size: 14px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.3s;
          }
          .select-btn {
            background-color: #4CAF50;
            color: white;
          }
          .select-btn:hover {
            background-color: #45a049;
          }
          .select-btn:disabled {
            background-color: #ccc;
            cursor: not-allowed;
          }
          .cancel-btn {
            background-color: #f44336;
            color: white;
          }
          .cancel-btn:hover {
            background-color: #da190b;
          }
          .no-results {
            padding: 20px;
            text-align: center;
            color: #666;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>🏛️ 自治体選択</h2>
          <p>フィルタ設定を行う自治体を選択してください</p>
          
          <div class="search-container">
            <input type="text" id="municipalitySearch" placeholder="自治体名で検索..." autocomplete="off">
          </div>
          
          <div class="municipality-list" id="municipalityList">
            <? for (var messageBoxId in configs) { ?>
              <div class="municipality-item" data-id="<?= messageBoxId ?>" onclick="selectMunicipality('<?= messageBoxId ?>')">
                <div class="municipality-name"><?= configs[messageBoxId].name ?></div>
                <div class="municipality-id">受信箱ID: <?= messageBoxId ?> | 都道府県: <?= configs[messageBoxId].prefecture ?></div>
              </div>
            <? } ?>
          </div>
          
          <div class="button-group">
            <button class="select-btn" id="selectButton" onclick="proceedToFilterConfig()" disabled>
              ✅ この自治体で設定する
            </button>
            <button class="cancel-btn" onclick="google.script.host.close()">
              ❌ キャンセル
            </button>
          </div>
        </div>
        
        <script>
          let selectedMunicipalityId = null;
          const searchInput = document.getElementById('municipalitySearch');
          const municipalityList = document.getElementById('municipalityList');
          const selectButton = document.getElementById('selectButton');
          
          // 検索機能
          searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const items = municipalityList.querySelectorAll('.municipality-item');
            let hasVisibleItems = false;
            
            items.forEach(function(item) {
              const name = item.querySelector('.municipality-name').textContent.toLowerCase();
              const id = item.dataset.id.toLowerCase();
              const prefecture = item.querySelector('.municipality-id').textContent.toLowerCase();
              
              if (name.includes(searchTerm) || id.includes(searchTerm) || prefecture.includes(searchTerm)) {
                item.style.display = 'block';
                hasVisibleItems = true;
              } else {
                item.style.display = 'none';
              }
            });
            
            // 検索結果なしの表示
            let noResultsDiv = document.getElementById('noResults');
            if (!hasVisibleItems && searchTerm) {
              if (!noResultsDiv) {
                noResultsDiv = document.createElement('div');
                noResultsDiv.id = 'noResults';
                noResultsDiv.className = 'no-results';
                noResultsDiv.textContent = '該当する自治体が見つかりませんでした';
                municipalityList.appendChild(noResultsDiv);
              }
              noResultsDiv.style.display = 'block';
            } else if (noResultsDiv) {
              noResultsDiv.style.display = 'none';
            }
          });
          
          // 自治体選択
          function selectMunicipality(messageBoxId) {
            // 既存の選択状態をクリア
            municipalityList.querySelectorAll('.municipality-item').forEach(function(item) {
              item.classList.remove('selected');
            });
            
            // 新しい選択状態を設定
            const selectedItem = municipalityList.querySelector('[data-id="' + messageBoxId + '"]');
            if (selectedItem) {
              selectedItem.classList.add('selected');
              selectedMunicipalityId = messageBoxId;
              selectButton.disabled = false;
            }
          }
          
          // フィルタ設定画面に進む
          function proceedToFilterConfig() {
            if (!selectedMunicipalityId) {
              alert('自治体を選択してください');
              return;
            }
            
            // ボタンを無効化して重複クリック防止
            var selectButton = document.getElementById('selectButton');
            selectButton.disabled = true;
            selectButton.textContent = '🔄 設定画面を準備中...';
            
            // サーバーサイド関数を呼び出してフィルタ設定画面を表示
            google.script.run
              .withSuccessHandler(function() {
                google.script.host.close();
              })
              .withFailureHandler(function(error) {
                alert('エラー: ' + error.toString());
                selectButton.disabled = false;
                selectButton.textContent = '✅ この自治体で設定する';
              })
              .showFilterConfigForMunicipality(selectedMunicipalityId);
          }
          
          // Enterキーで検索/選択
          searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              const visibleItems = Array.from(municipalityList.querySelectorAll('.municipality-item'))
                .filter(item => item.style.display !== 'none');
              
              if (visibleItems.length === 1) {
                // 検索結果が1つの場合は自動選択
                selectMunicipality(visibleItems[0].dataset.id);
              }
            }
          });
        </script>
      </body>
    </html>
  `);
  
  // テンプレートにデータを渡す
  htmlTemplate.configs = configs;
  
  // HTMLダイアログを表示
  var htmlOutput = htmlTemplate.evaluate()
    .setWidth(700)
    .setHeight(600);
    
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, '自治体選択 - Slackフィルタ設定');
}

/**
 * 選択された自治体のフィルタ設定画面を表示
 * @param {string} messageBoxId 受信箱ID
 */
function showFilterConfigForMunicipality(messageBoxId) {
  var configs = loadMunicipalityConfigFromSheet(true);
  var config = configs[messageBoxId];
  
  if (!config) {
    throw new Error('選択された自治体の設定が見つかりません: ' + messageBoxId);
  }
  
  // フィルタ設定HTMLダイアログを表示
  showFilterConfigHtmlDialog(messageBoxId, config);
}

/**
 * HTMLダイアログでフィルタ設定を表示
 * @param {string} messageBoxId 受信箱ID
 * @param {Object} config 自治体設定
 */
function showFilterConfigHtmlDialog(messageBoxId, config) {
  // ラベルとチケット分類のデータを取得
  var labelsMap = getLabelsMap(messageBoxId);
  var categoriesMap = getCaseCategoriesMap(messageBoxId);
  
  // 現在の設定を取得
  var currentFilter = config.slackNotificationFilter || {};
  
  // HTMLテンプレートを作成
  var htmlTemplate = HtmlService.createTemplate(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; padding-bottom: 100px; }
          .section { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          .section h3 { margin-top: 0; color: #333; }
          .checkbox-group { max-height: 150px; overflow-y: auto; border: 1px solid #eee; padding: 10px; }
          .checkbox-item { margin: 5px 0; }
          .button-group { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #ddd; padding: 15px; text-align: center; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); }
          button { margin: 0 10px; padding: 10px 20px; font-size: 14px; }
          .save-btn { background-color: #4CAF50; color: white; border: none; border-radius: 4px; }
          .save-btn:disabled { background-color: #cccccc; cursor: not-allowed; }
          .cancel-btn { background-color: #f44336; color: white; border: none; border-radius: 4px; }
          .preview { background-color: #f9f9f9; border: 1px solid #ddd; padding: 10px; margin-top: 10px; font-family: monospace; white-space: pre-wrap; }
          .notification { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 15px 25px; border-radius: 8px; font-size: 16px; font-weight: bold; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
          .notification.success { background-color: #4CAF50; color: white; }
          .notification.error { background-color: #f44336; color: white; }
          .notification.show { animation: slideDown 0.3s ease-out; }
          .notification.hide { animation: slideUp 0.3s ease-in; }
          @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
          @keyframes slideUp { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(-20px); } }
        </style>
      </head>
      <body>
        <h2>🔧 Slackフィルタ設定</h2>
        <p><strong>自治体:</strong> <?= municipalityName ?></p>
        <p><strong>受信箱ID:</strong> <?= messageBoxId ?></p>
        
        <div class="section">
          <h3>🗂️ チケット分類フィルタ</h3>
          <div>
            <strong>通知対象分類（チェックした分類のチケットのみ通知します）:</strong>
            <div class="checkbox-group" id="includeCategories">
              <? for (var categoryId in categoriesMap) { ?>
                <div class="checkbox-item">
                  <input type="checkbox" id="include_category_<?= categoryId ?>" value="<?= categoryId ?>"
                         <?= (currentFilter.include_case_category_ids && currentFilter.include_case_category_ids.includes(parseInt(categoryId))) ? 'checked' : '' ?>>
                  <label for="include_category_<?= categoryId ?>"><?= categoryId ?>: <?= categoriesMap[categoryId] ?></label>
                </div>
              <? } ?>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3>🏷️ ラベルフィルタ</h3>
          <div>
            <strong>通知対象ラベル（チェックしたラベルのチケットのみ通知します）:</strong>
            <div class="checkbox-group" id="includeLabels">
              <? for (var labelId in labelsMap) { ?>
                <div class="checkbox-item">
                  <input type="checkbox" id="include_label_<?= labelId ?>" value="<?= labelId ?>" 
                         <?= (currentFilter.include_label_ids && currentFilter.include_label_ids.includes(parseInt(labelId))) ? 'checked' : '' ?>>
                  <label for="include_label_<?= labelId ?>"><?= labelId ?>: <?= labelsMap[labelId] ?></label>
                </div>
              <? } ?>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3>📋 設定プレビュー</h3>
          <div class="preview" id="configPreview"></div>
        </div>
        
        <div class="button-group">
          <button class="save-btn" onclick="saveConfig()">💾 保存</button>
          <button class="cancel-btn" onclick="google.script.host.close()">❌ キャンセル</button>
          <button onclick="clearAllFilters()">🗑️ フィルタクリア</button>
        </div>
        
        <script>
          // 設定変更時にプレビューを更新
          document.addEventListener('change', updatePreview);
          
          // 初期表示時にプレビューを更新
          window.onload = function() {
            updatePreview();
          };
          
          function updatePreview() {
            var config = buildConfigFromForm();
            var preview = document.getElementById('configPreview');
            
            if (Object.keys(config).length === 0) {
              preview.textContent = 'フィルタ設定なし（全チケット通知）';
            } else {
              preview.textContent = JSON.stringify(config, null, 2);
            }
          }
          
          function buildConfigFromForm() {
            var config = {};
            
            // 通知対象分類
            var includeCategories = [];
            document.querySelectorAll('#includeCategories input:checked').forEach(function(cb) {
              includeCategories.push(parseInt(cb.value));
            });
            if (includeCategories.length > 0) {
              config.include_case_category_ids = includeCategories;
            }
            
            // 通知対象ラベル
            var includeLabels = [];
            document.querySelectorAll('#includeLabels input:checked').forEach(function(cb) {
              includeLabels.push(parseInt(cb.value));
            });
            if (includeLabels.length > 0) {
              config.include_label_ids = includeLabels;
            }
            
            return config;
          }
          
          function showNotification(message, type, duration) {
            duration = duration || 3000;
            
            // 既存の通知があれば削除
            var existingNotification = document.querySelector('.notification');
            if (existingNotification) {
              existingNotification.remove();
            }
            
            // 新しい通知を作成
            var notification = document.createElement('div');
            notification.className = 'notification ' + type;
            notification.textContent = message;
            
            // ページに追加
            document.body.appendChild(notification);
            
            // アニメーション表示
            setTimeout(function() {
              notification.classList.add('show');
            }, 10);
            
            // 自動で非表示
            setTimeout(function() {
              notification.classList.add('hide');
              setTimeout(function() {
                if (notification.parentNode) {
                  notification.parentNode.removeChild(notification);
                }
              }, 300);
            }, duration);
          }
          
          function saveConfig() {
            var config = buildConfigFromForm();
            
            // 保存ボタンを無効化して状態変更
            var saveButton = document.querySelector('.save-btn');
            var originalText = saveButton.textContent;
            saveButton.disabled = true;
            saveButton.textContent = '🔄 設定を保存中...';
            
            // サーバーサイド関数を呼び出し
            google.script.run
              .withSuccessHandler(function() {
                saveButton.textContent = '✅ 保存完了';
                showNotification('✅ フィルタ設定を保存しました', 'success', 2000);
                setTimeout(function() {
                  google.script.host.close();
                }, 2500);
              })
              .withFailureHandler(function(error) {
                // エラー時はボタンを元に戻す
                saveButton.disabled = false;
                saveButton.textContent = originalText;
                showNotification('❌ 保存エラー: ' + error.toString(), 'error', 5000);
              })
              .saveFilterConfig('<?= messageBoxId ?>', config);
          }
          
          function clearAllFilters() {
            if (confirm('全てのフィルタ設定をクリアしますか？')) {
              document.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
                cb.checked = false;
              });
              updatePreview();
            }
          }
        </script>
      </body>
    </html>
  `);
  
  // テンプレートにデータを渡す
  htmlTemplate.messageBoxId = messageBoxId;
  htmlTemplate.municipalityName = config.name;
  htmlTemplate.labelsMap = labelsMap;
  htmlTemplate.categoriesMap = categoriesMap;
  htmlTemplate.currentFilter = currentFilter;
  
  // HTMLダイアログを表示
  var htmlOutput = htmlTemplate.evaluate()
    .setWidth(850)
    .setHeight(700);
    
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Slackフィルタ設定 - ' + config.name);
}

/**
 * サーバーサイド: フィルタ設定保存
 * @param {string} messageBoxId 受信箱ID
 * @param {Object} filterConfig フィルタ設定オブジェクト
 */
function saveFilterConfig(messageBoxId, filterConfig) {
  console.log('saveFilterConfig呼び出し - 受信箱ID: ' + messageBoxId);
  console.log('フィルタ設定: ' + JSON.stringify(filterConfig));
  
  try {
    updateFilterConfigInSheet(messageBoxId, filterConfig);
    console.log('フィルタ設定保存成功');
  } catch (error) {
    console.error('フィルタ設定保存エラー: ' + error.toString());
    throw error;
  }
}

/**
 * 📮受信箱シートのフィルタ設定を更新
 * @param {string} messageBoxId 受信箱ID
 * @param {Object} filterConfig フィルタ設定オブジェクト
 */
function updateFilterConfigInSheet(messageBoxId, filterConfig) {
  console.log('updateFilterConfigInSheet開始 - 受信箱ID: ' + messageBoxId + ' (type: ' + typeof messageBoxId + ')');
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName('📮受信箱');
  
  if (!configSheet) {
    throw new Error('📮受信箱シートが見つかりません');
  }
  
  var data = configSheet.getDataRange().getValues();
  console.log('📮受信箱シートの行数: ' + data.length);
  
  // ヘッダー行の確認（5行目）
  if (data.length > 4) {
    console.log('ヘッダー行: ' + JSON.stringify(data[4]));
  }
  
  // 該当する受信箱IDの行を探す
  var found = false;
  for (var i = 5; i < data.length; i++) { // 6行目以降（0ベースで5以降）
    var rowMessageBoxId = data[i][3]; // D列: 受信箱ID
    console.log('行' + (i + 1) + ' の受信箱ID: "' + rowMessageBoxId + '" (type: ' + typeof rowMessageBoxId + ')');
    
    // 文字列と数値の両方で比較
    if (rowMessageBoxId == messageBoxId || 
        rowMessageBoxId === messageBoxId || 
        String(rowMessageBoxId) === String(messageBoxId)) {
      
      console.log('受信箱ID一致: 行' + (i + 1));
      
      // G列（6列目、0ベースで6）にJSON文字列を設定
      var jsonString = Object.keys(filterConfig).length > 0 ? JSON.stringify(filterConfig) : '';
      configSheet.getRange(i + 1, 7).setValue(jsonString);
      
      console.log('フィルタ設定更新完了: ' + messageBoxId + ' -> ' + jsonString);
      found = true;
      return;
    }
  }
  
  if (!found) {
    // デバッグ情報を追加
    var allMessageBoxIds = [];
    for (var j = 5; j < data.length; j++) {
      if (data[j][3]) {
        allMessageBoxIds.push('"' + data[j][3] + '" (' + typeof data[j][3] + ')');
      }
    }
    
    var errorMsg = '受信箱ID ' + messageBoxId + ' が見つかりません。\n' +
                  '利用可能な受信箱ID: ' + allMessageBoxIds.join(', ');
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}
