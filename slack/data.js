/**
 * Slack通知用データ取得モジュール
 * チケット情報、分類、ラベルの取得と変換を担当
 */

/**
 * 🎫未対応チケットシートから指定受信箱IDのチケット情報を取得
 * @param {string} messageBoxId 受信箱ID
 * @return {Array} チケット配列
 */
function getTicketsFromSheet(messageBoxId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('🎫未対応チケット');
    
    if (!sheet) {
      console.log('🎫未対応チケットシートが見つかりません');
      return [];
    }
    
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 5) { // ヘッダー行（5行目）を除く
      console.log('🎫未対応チケットシートにデータがありません');
      return [];
    }
    
    // ヘッダー行を確認（5行目、0ベースで4）
    var headers = data[4];
    console.log('シートヘッダー: ' + headers.join(', '));
    
    var tickets = [];
    
    // データ行をループして該当自治体のチケットを抽出（6行目以降、0ベースで5以降）
    for (var i = 5; i < data.length; i++) {
      var row = data[i];
      
      // 受信箱IDが一致するかチェック（A列: 受信箱ID）
      if (row[0] === messageBoxId) {
        var ticket = {
          messageBox_id: row[0], // A列: 受信箱ID
          municipality_name: row[1], // B列: 自治体名
          ticket_id: row[2], // C列: ID
          title: row[3] || '', // D列: タイトル
          status_cd: row[4] || 'open', // E列: ステータス
          created_at: row[5] || null, // F列: 作成日（Dateオブジェクト）
          last_updated_at: row[6] || null, // G列: 更新日（Dateオブジェクト）
          case_category_names: row[7] && row[7].toString().trim() ? row[7].toString().split(', ').filter(function(name) { return name; }) : ['未設定'], // H列: チケット分類名
          label_names: row[8] && row[8].toString().trim() ? row[8].toString().split(', ').filter(function(name) { return name; }) : ['未設定'], // I列: ラベル名
          pending_reason_id: row[9] || null // J列: 保留理由ID
        };
        
        tickets.push(ticket);
      }
    }
    
    console.log('受信箱ID: ' + messageBoxId + 'のチケット件数（シートから）: ' + tickets.length);
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
 * 指定受信箱IDのチケット分類マップを取得
 * @param {string} messageBoxId 受信箱ID
 * @return {Object} チケット分類マップ（ID → 名前）
 */
function getCaseCategoriesMap(messageBoxId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('🏷️チケット分類');
    
    if (!sheet) {
      console.log('🏷️チケット分類シートが見つかりません');
      return {};
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 5) {
      console.log('🏷️チケット分類シートにデータがありません');
      return {};
    }
    
    var categoriesMap = {};
    
    // データ行をループ（6行目以降、0ベースで5以降）
    for (var i = 5; i < data.length; i++) {
      var row = data[i];
      
      // 受信箱IDが一致するかチェック（A列: 受信箱ID）
      if (row[0] && row[0].toString() === messageBoxId.toString()) {
        var categoryId = row[2]; // C列: チケット分類ID
        var categoryName = row[3]; // D列: チケット分類名
        
        if (categoryId && categoryName) {
          // 数値IDと文字列IDの両方に対応
          var numericId = parseInt(categoryId);
          if (!isNaN(numericId)) {
            categoriesMap[numericId] = categoryName;
          }
          categoriesMap[categoryId] = categoryName;
          categoriesMap[categoryId.toString()] = categoryName;
        }
      }
    }
    
    console.log('チケット分類マップ取得完了: ' + Object.keys(categoriesMap).length + '件');
    return categoriesMap;
    
  } catch (error) {
    console.error('チケット分類マップ取得エラー: ' + error.toString());
    return {};
  }
}

/**
 * 指定受信箱IDのラベルマップを取得
 * @param {string} messageBoxId 受信箱ID
 * @return {Object} ラベルマップ（ID → 名前）
 */
function getLabelsMap(messageBoxId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('🏷️ラベル');
    
    if (!sheet) {
      console.log('🏷️ラベルシートが見つかりません');
      return {};
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 5) {
      console.log('🏷️ラベルシートにデータがありません');
      return {};
    }
    
    var labelsMap = {};
    
    // データ行をループ（6行目以降、0ベースで5以降）
    for (var i = 5; i < data.length; i++) {
      var row = data[i];
      
      // 受信箱IDが一致するかチェック（A列: 受信箱ID）
      if (row[0] && row[0].toString() === messageBoxId.toString()) {
        var labelId = row[2]; // C列: ラベルID
        var labelName = row[3]; // D列: ラベル名
        
        if (labelId && labelName) {
          // 数値IDと文字列IDの両方に対応
          var numericId = parseInt(labelId);
          if (!isNaN(numericId)) {
            labelsMap[numericId] = labelName;
          }
          labelsMap[labelId] = labelName;
          labelsMap[labelId.toString()] = labelName;
        }
      }
    }
    
    console.log('ラベルマップ取得完了: ' + Object.keys(labelsMap).length + '件');
    if (Object.keys(labelsMap).length > 0) {
      console.log('ラベルマップサンプル: ' + JSON.stringify(Object.keys(labelsMap).slice(0, 5).reduce(function(obj, key) {
        obj[key] = labelsMap[key];
        return obj;
      }, {})));
    }
    return labelsMap;
    
  } catch (error) {
    console.error('ラベルマップ取得エラー: ' + error.toString());
    return {};
  }
}

/**
 * チケット分類IDから分類名の配列を取得
 * @param {Array} categoryIds チケット分類ID配列
 * @param {Object} categoriesMap チケット分類マップ
 * @return {Array} チケット分類名配列
 */
function getCategoryNames(categoryIds, categoriesMap) {
  if (!categoryIds || categoryIds.length === 0) {
    return [];
  }
  
  return categoryIds.map(function(categoryId) {
    // 文字列と数値の両方でカテゴリマップを検索
    var categoryName = categoriesMap[categoryId] || categoriesMap[parseInt(categoryId)] || categoriesMap[categoryId.toString()];
    return categoryName || 'ID:' + categoryId; // 名前が見つからない場合はIDを表示
  });
}

/**
 * ラベルIDからラベル名の配列を取得
 * @param {Array} labelIds ラベルID配列
 * @param {Object} labelsMap ラベルマップ
 * @return {Array} ラベル名配列
 */
function getLabelNames(labelIds, labelsMap) {
  if (!labelIds || labelIds.length === 0) {
    return [];
  }
  
  return labelIds.map(function(labelId) {
    // 文字列と数値の両方でラベルマップを検索
    var labelName = labelsMap[labelId] || labelsMap[parseInt(labelId)] || labelsMap[labelId.toString()];
    
    // デバッグ用ログ：ID変換の詳細
    if (!labelName) {
      console.log('ラベル名が見つかりません - ID: ' + labelId + ' (type: ' + typeof labelId + ')');
      console.log('利用可能なラベルID: ' + Object.keys(labelsMap).slice(0, 10).join(', '));
    }
    
    return labelName || 'ID:' + labelId; // 名前が見つからない場合はIDを表示
  });
}

/**
 * Dateオブジェクトを読みやすい形式に変換
 * @param {Date} date Dateオブジェクト
 * @return {string} 読みやすい形式の日時 (yyyy/MM/dd HH:mm)
 */
function formatDate(date) {
  if (!date || !(date instanceof Date)) return '';
  
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
}
