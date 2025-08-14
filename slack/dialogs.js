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

    // HTMLテンプレートを使用してページを作成
    var htmlTemplate = HtmlService.createTemplateFromFile('slack/municipality_selector');
    
    // テンプレート変数を設定
    htmlTemplate.configs = configs;
    htmlTemplate.municipalityItemsHtml = municipalityItemsHtml;
    
    var htmlOutput = htmlTemplate.evaluate()
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
