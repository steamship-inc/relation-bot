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
    var htmlTemplate = HtmlService.createTemplateFromFile('slack/ui/municipality_selector');
    
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
    throw error; // エラーを再スローして呼び出し元に伝える
  }
}
