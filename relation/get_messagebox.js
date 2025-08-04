// re:lation APIからメッセージボックス一覧を取得し、自治体設定シートを更新する
function fetchMessageBoxes() {
  // スクリプトプロパティからAPIキーを取得
  var apiKey = getRelationApiKey();

  // メッセージボックス一覧APIのエンドポイント
  var apiUrl = buildMessageBoxesUrl();

  // APIリクエスト（GET）
  var response = UrlFetchApp.fetch(apiUrl, {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    }
  });

  // レスポンス（JSON配列）をパース
  var messageBoxes = JSON.parse(response.getContentText());

  // 自治体設定シートを取得
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName('🏛️自治体設定') || ss.getSheetByName('自治体設定');

  if (!configSheet) {
    // 自治体設定シートがない場合は作成
    console.log('自治体設定シートが見つかりません。初期化します。');
    createMunicipalityConfigSheet();
    configSheet = ss.getSheetByName('🏛️自治体設定');
  }

  // 既存データを取得
  var data = configSheet.getDataRange().getValues();
  var headers = data[0];
  
  console.log('取得したメッセージボックス数: ' + messageBoxes.length);
  
  // メッセージボックス情報で自治体設定シートを更新
  messageBoxes.forEach(function(messageBox, index) {
    var messageBoxId = messageBox.message_box_id;
    var municipalityName = messageBox.name;
    
    // 既存の行を検索（D列のメッセージボックスIDで照合）
    var existingRowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][3] === messageBoxId) { // D列（メッセージボックスID）で照合
        existingRowIndex = i + 1; // シート上の行番号（1ベース）
        break;
      }
    }
    
    if (existingRowIndex > 0) {
      // 既存行を更新：B列（自治体名）とD列（メッセージボックスID）を更新
      configSheet.getRange(existingRowIndex, 2).setValue(municipalityName); // B列：自治体名
      configSheet.getRange(existingRowIndex, 4).setValue(messageBoxId);     // D列：メッセージボックスID
      console.log('更新: ' + municipalityName + ' (ID: ' + messageBoxId + ')');
    } else {
      // 新規行を追加
      var newRowIndex = configSheet.getLastRow() + 1;
      
      // 自治体名から自治体コードを取得
      var municipalityCode = getMunicipalityCode(municipalityName);
      
      configSheet.getRange(newRowIndex, 1).setValue(municipalityCode);      // A列：自治体コード
      configSheet.getRange(newRowIndex, 2).setValue(municipalityName);      // B列：自治体名
      configSheet.getRange(newRowIndex, 3).setValue('');                    // C列：都道府県（空）
      configSheet.getRange(newRowIndex, 4).setValue(messageBoxId);          // D列：メッセージボックスID
      configSheet.getRange(newRowIndex, 5).setValue('');                    // E列：Slackチャンネル（空）
      configSheet.getRange(newRowIndex, 6).setValue('');                    // F列：Slack通知テンプレート（空）
      configSheet.getRange(newRowIndex, 7).setValue('');                    // G列：Slack通知フィルタ（空）
      
      console.log('新規追加: ' + municipalityName + ' (コード: ' + municipalityCode + ', ID: ' + messageBoxId + ')');
    }
  });

  // 取得件数をログ出力
  console.log('自治体設定シートの更新が完了しました（' + messageBoxes.length + ' 件処理）');
}

/**
 * 自治体名から自治体コードを取得する
 * @param {string} municipalityName 自治体名
 * @return {string} 自治体コード（取得できない場合はフォールバック値）
 */
function getMunicipalityCode(municipalityName) {
  try {
    // 国土交通省 自治体コードAPI（GraphQL）
    var apiUrl = 'https://www.mlit-data.jp/api/graphql';
    
    // GraphQLクエリ：全市区町村を取得して名前で検索
    var query = {
      query: `
        query {
          municipalities {
            code
            name
            prefecture_code
          }
        }
      `
    };
    
    var response = UrlFetchApp.fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(query),
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      var result = JSON.parse(response.getContentText());
      
      if (result && result.data && result.data.municipalities) {
        // 自治体名で検索
        var municipalities = result.data.municipalities;
        
        for (var i = 0; i < municipalities.length; i++) {
          var municipality = municipalities[i];
          
          // 完全一致または部分一致で検索
          if (municipality.name === municipalityName || 
              municipality.name.indexOf(municipalityName) !== -1 ||
              municipalityName.indexOf(municipality.name) !== -1) {
            
            var municipalityCode = municipality.code.toString();
            console.log('自治体コード取得成功: ' + municipalityName + ' → ' + municipality.name + ' (' + municipalityCode + ')');
            return municipalityCode;
          }
        }
      }
    } else {
      console.log('自治体コードAPI HTTPエラー: ' + response.getResponseCode());
    }
    
    console.log('自治体コードAPI: ' + municipalityName + 'の結果が見つかりません');
    
  } catch (error) {
    console.error('自治体コードAPI取得エラー: ' + error.toString());
  }
  
  // フォールバック：自治体名から推測したコードを生成
  var fallbackCode = generateFallbackMunicipalityCode(municipalityName);
  console.log('フォールバック自治体コード: ' + municipalityName + ' → ' + fallbackCode);
  return fallbackCode;
}

/**
 * 自治体名からフォールバック用の自治体コードを生成
 * @param {string} municipalityName 自治体名
 * @return {string} フォールバック自治体コード
 */
function generateFallbackMunicipalityCode(municipalityName) {
  // 既知の自治体のマッピング（手動で追加可能）
  var knownMunicipalities = {
    '山鹿市': '432113',
    '福岡市': '401307', 
    '熊本市': '431001',
    '札幌市': '011002',
    '厚真町': '015814',
    '西海市': '422134'  // 西海市を追加
  };
  
  if (knownMunicipalities[municipalityName]) {
    return knownMunicipalities[municipalityName];
  }
  
  // 不明な場合は 'temp_' + 自治体名をベースにした一意ID
  var sanitized = municipalityName.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
  var hash = hashString(sanitized);
  return 'temp_' + Math.abs(hash).toString().substring(0, 6);
}

/**
 * 文字列のハッシュ値を計算
 * @param {string} str ハッシュ化する文字列
 * @return {number} ハッシュ値
 */
function hashString(str) {
  var hash = 0;
  if (str.length === 0) return hash;
  
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  
  return hash;
}
