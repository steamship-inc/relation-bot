/**
 * チケット詳細ページ管理モジュール
 * 広いUIでチケット詳細を表示
 */

/**
 * チケット詳細ページを新しいタブで開く
 */
function openTicketDetailPage() {
  try {
    // HTMLテンプレートからページを作成（スクリプトレット実行のため）
    var htmlOutput = HtmlService.createTemplateFromFile('ticket-viewer/viewer_page')
      .evaluate()
      .setTitle('🎫 チケット詳細 - re:lation連携')
      .setWidth(1200)
      .setHeight(800);
    
    // 新しいタブで開く
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'チケット詳細');
    
    console.log('🎫 チケット詳細ページ表示');
    
  } catch (error) {
    console.error('❌ チケット詳細ページ表示失敗: ' + error.message);
    SpreadsheetApp.getUi().alert('エラー', 'チケット詳細ページの表示に失敗しました。\n\n' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 指定受信箱のチケット一覧を取得（タイトルはシートから取得）
 * @param {string} messageBoxId 受信箱ID
 * @return {Array} チケット一覧
 */
function fetchTicketList(messageBoxId) {
  try {
    // APIキーを取得
    var apiKey = getRelationApiKey();
    
    // チケット検索APIを呼び出し
    var apiUrl = getRelationEndpoint('tickets_search', { messageBoxId: messageBoxId });
    var payload = {
      status_cds: DEFAULT_SEARCH_CONDITIONS.status_cds,
      per_page: DEFAULT_SEARCH_CONDITIONS.per_page, // デフォルト値を使用
      page: DEFAULT_SEARCH_CONDITIONS.page
    };
    
    console.log('🔍 チケット検索API呼び出し: ' + apiUrl);
    console.log('📋 送信ペイロード: ' + JSON.stringify(payload));
    
    var response = UrlFetchApp.fetch(apiUrl, {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true // エラーレスポンスも取得
    });
    
    // レスポンスステータスをチェック
    if (response.getResponseCode() !== 200) {
      var errorText = response.getContentText();
      console.error('❌ API エラーレスポンス: ' + response.getResponseCode() + ' - ' + errorText);
      throw new Error('API呼び出しエラー (' + response.getResponseCode() + '): ' + errorText);
    }
    
    var tickets = JSON.parse(response.getContentText());
    
    console.log('🎫 チケット一覧取得成功: ' + tickets.length + '件');
    
    // 必要な情報のみを返す（軽量化）、タイトルはシートから取得
    return tickets.map(function(ticket) {
      var sheetTitle = getTicketTitleFromSheet(ticket.ticket_id);
      var title = sheetTitle || ticket.title; // シートにタイトルがない場合はAPIのタイトルを使用
      
      return {
        ticket_id: ticket.ticket_id,
        title: title,
        status_cd: ticket.status_cd,
        created_at: ticket.created_at,
        last_updated_at: ticket.last_updated_at
      };
    });
    
  } catch (error) {
    console.error('❌ チケット一覧取得失敗: ' + error.message);
    throw new Error('チケット一覧の取得に失敗しました: ' + error.message);
  }
}

/**
 * 🎫未対応チケットシートからチケットタイトルを取得
 * @param {string} ticketId チケットID
 * @return {string} チケットタイトル（見つからない場合は空文字）
 */
function getTicketTitleFromSheet(ticketId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('🎫未対応チケット');
    
    if (!sheet) {
      console.log('🎫未対応チケットシートが見つかりません');
      return '';
    }
    
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 5) { // ヘッダー行（5行目）を除く
      console.log('🎫未対応チケットシートにデータがありません');
      return '';
    }
    
    // データ行をループしてチケットIDが一致する行を探す（6行目以降、0ベースで5以降）
    for (var i = 5; i < data.length; i++) {
      var row = data[i];
      
      // C列（チケットID）が一致するかチェック
      if (row[2] && row[2].toString() === ticketId.toString()) {
        var title = row[3] || ''; // D列: タイトル
        console.log('🎫 シートからタイトル取得: ' + ticketId + ' -> ' + title);
        return title;
      }
    }
    
    console.log('🎫 シートにチケットIDが見つかりません: ' + ticketId);
    return '';
    
  } catch (error) {
    console.error('❌ シートからタイトル取得失敗: ' + error.message);
    return '';
  }
}

/**
 * チケット詳細をAPIから取得（タイトルはシートから取得）
 * @param {string} messageBoxId 受信箱ID
 * @param {string} ticketId チケットID
 * @return {Object} チケット詳細オブジェクト
 */
function fetchTicketDetailWithSheetTitle(messageBoxId, ticketId) {
  try {
    // APIからチケット詳細を取得
    var ticketDetail = fetchTicketDetail(messageBoxId, ticketId);
    
    // シートからタイトルを取得して上書き
    var sheetTitle = getTicketTitleFromSheet(ticketId);
    if (sheetTitle) {
      ticketDetail.title = sheetTitle;
      console.log('🎫 タイトルをシートから上書き: ' + sheetTitle);
    } else {
      console.log('🎫 シートにタイトルなし、APIタイトルを使用: ' + ticketDetail.title);
    }
    
    return ticketDetail;
    
  } catch (error) {
    console.error('❌ チケット詳細取得失敗: ' + error.message);
    throw error;
  }
}

/**
 * 🎫未対応チケットシートから自治体一覧を取得（ticket-viewer専用）
 * @return {Object} 受信箱IDをキーとした自治体情報オブジェクト
 */
function loadMunicipalitiesFromOpenTicketSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('🎫未対応チケット');
    
    if (!sheet) {
      throw new Error('🎫未対応チケットシートが見つかりません。\n先に「🟩 re:lation」→「🎫未対応チケット取得」を実行してください。');
    }
    
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 5) { // ヘッダー行（5行目）を除く
      throw new Error('🎫未対応チケットシートにデータがありません。\n先に「🟩 re:lation」→「🎫未対応チケット取得」を実行してください。');
    }
    
    var municipalities = {};
    var processedIds = new Set(); // 重複チェック用
    
    // データ行をループして自治体情報を取得（6行目以降、0ベースで5以降）
    for (var i = 5; i < data.length; i++) {
      var row = data[i];
      
      var messageBoxId = row[0]; // A列: 受信箱ID
      var municipalityName = row[1]; // B列: 自治体名
      
      // 受信箱IDまたは自治体名が空の場合はスキップ
      if (!messageBoxId || !municipalityName) {
        continue;
      }
      
      // 重複チェック（同じ受信箱IDは1つだけ保持）
      if (processedIds.has(messageBoxId)) {
        continue;
      }
      
      municipalities[messageBoxId] = {
        messageBoxId: messageBoxId,
        name: municipalityName
      };
      
      processedIds.add(messageBoxId);
    }
    
    console.log('🏛️ 未対応チケットシートから自治体情報読み込み完了: ' + Object.keys(municipalities).length + '件');
    
    return municipalities;
    
  } catch (error) {
    console.error('❌ 自治体情報読み込み失敗: ' + error.message);
    throw error;
  }
}


