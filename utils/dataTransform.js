/**
 * データ変換ユーティリティ
 */

/**
 * ID文字列をパースして配列に変換
 * @param {string} idsString カンマ区切りのID文字列
 * @returns {Array} ID配列
 */
function parseIds(idsString) {
  if (!idsString || idsString.trim() === '') {
    return [];
  }
  
  return idsString.split(',').map(function(id) {
    return parseInt(id.trim(), 10);
  }).filter(function(id) {
    return !isNaN(id);
  });
}

/**
 * ISO日付文字列を日本語形式に変換
 * @param {string} isoString ISO形式の日付文字列
 * @returns {string} 日本語形式の日付文字列
 */
function formatDate(isoString) {
  if (!isoString) return '';
  
  try {
    var date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    var year = date.getFullYear();
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var day = ('0' + date.getDate()).slice(-2);
    var hours = ('0' + date.getHours()).slice(-2);
    var minutes = ('0' + date.getMinutes()).slice(-2);
    
    return year + '/' + month + '/' + day + ' ' + hours + ':' + minutes;
  } catch (error) {
    console.error('日付フォーマットエラー:', error);
    return isoString;
  }
}

/**
 * ISO日付文字列をDateオブジェクトに変換
 * @param {string} isoString ISO形式の日付文字列
 * @returns {Date} Dateオブジェクト
 */
function parseDate(isoString) {
  if (!isoString) return null;
  return new Date(isoString);
}

/**
 * カテゴリIDから名前を取得
 * @param {Array} categoryIds カテゴリID配列
 * @param {Object} categoriesMap カテゴリマップ
 * @returns {Array} カテゴリ名配列
 */
function getCategoryNames(categoryIds, categoriesMap) {
  if (!categoryIds || categoryIds.length === 0) {
    return [];
  }
  
  return categoryIds.map(function(categoryId) {
    var category = categoriesMap[categoryId];
    return category ? category.name : 'ID:' + categoryId;
  }).filter(function(name) {
    return name && name.trim() !== '';
  });
}

/**
 * ラベルIDから名前を取得
 * @param {Array} labelIds ラベルID配列
 * @param {Object} labelsMap ラベルマップ
 * @returns {Array} ラベル名配列
 */
function getLabelNames(labelIds, labelsMap) {
  if (!labelIds || labelIds.length === 0) {
    return [];
  }
  
  return labelIds.map(function(labelId) {
    var label = labelsMap[labelId];
    if (!label) {
      console.error('ラベル名が見つかりません - ID: ' + labelId + ' (type: ' + typeof labelId + ')');
      return 'ID:' + labelId;
    }
    return label.name;
  }).filter(function(name) {
    return name && name.trim() !== '';
  });
}