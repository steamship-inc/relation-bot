/**
 * データ処理ユーティリティ
 * チケットデータの変換、フィルタリング、ソートを担当
 */

/**
 * チケットデータをスプレッドシート用にフォーマット
 * @param {Array} tickets チケット配列
 * @param {Object} options フォーマットオプション
 * @return {Array} フォーマット済みデータ配列
 */
function formatTicketsForSpreadsheet(tickets, options) {
  options = options || {};
  
  if (!Array.isArray(tickets)) {
    console.warn('チケットデータが配列ではありません:', typeof tickets);
    return [];
  }
  
  return tickets.map(function(ticket) {
    try {
      return [
        ticket.ticket_id || '',
        ticket.subject || '',
        ticket.status || '',
        ticket.case_category_name || '未分類',
        ticket.municipality_name || '不明',
        formatDateForSpreadsheet(ticket.created_at),
        formatDateForSpreadsheet(ticket.updated_at),
        ticket.priority || '通常',
        ticket.assignee_name || '未割り当て',
        buildTicketUrl(ticket.message_box_id, ticket.ticket_id, ticket.status),
        formatLabelsForSpreadsheet(ticket.labels),
        ticket.description ? truncateText(ticket.description, 200) : ''
      ];
    } catch (error) {
      console.error('チケットフォーマットエラー:', error.toString(), ticket);
      return createErrorRow(ticket, error);
    }
  });
}

/**
 * エラー発生時の行データを作成
 * @param {Object} ticket 元のチケットデータ
 * @param {Error} error エラーオブジェクト
 * @return {Array} エラー行データ
 */
function createErrorRow(ticket, error) {
  return [
    ticket.ticket_id || '不明',
    'データ処理エラー: ' + error.message,
    'error',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ];
}

/**
 * 日付をスプレッドシート用にフォーマット
 * @param {string} dateString 日付文字列
 * @return {string} フォーマット済み日付
 */
function formatDateForSpreadsheet(dateString) {
  if (!dateString) return '';
  
  try {
    var date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // 無効な日付の場合は元の文字列を返す
    }
    return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  } catch (error) {
    console.warn('日付フォーマットエラー:', dateString, error.toString());
    return dateString;
  }
}

/**
 * ラベル配列をスプレッドシート用文字列に変換
 * @param {Array} labels ラベル配列
 * @return {string} カンマ区切りのラベル文字列
 */
function formatLabelsForSpreadsheet(labels) {
  if (!Array.isArray(labels) || labels.length === 0) {
    return '';
  }
  
  return labels.map(function(label) {
    return typeof label === 'object' ? (label.name || label.label || '') : String(label);
  }).filter(function(label) {
    return label.trim() !== '';
  }).join(', ');
}

/**
 * テキストを指定文字数で切り詰め
 * @param {string} text 対象テキスト
 * @param {number} maxLength 最大文字数
 * @return {string} 切り詰められたテキスト
 */
function truncateText(text, maxLength) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * チケットデータを条件でフィルタリング
 * @param {Array} tickets チケット配列
 * @param {Object} filters フィルター条件
 * @return {Array} フィルタリング済みチケット配列
 */
function filterTickets(tickets, filters) {
  if (!Array.isArray(tickets)) {
    return [];
  }
  
  if (!filters || Object.keys(filters).length === 0) {
    return tickets;
  }
  
  return tickets.filter(function(ticket) {
    // ステータスフィルター
    if (filters.statuses && Array.isArray(filters.statuses)) {
      if (filters.statuses.indexOf(ticket.status) === -1) {
        return false;
      }
    }
    
    // カテゴリフィルター
    if (filters.categories && Array.isArray(filters.categories)) {
      if (filters.categories.indexOf(ticket.case_category_name) === -1) {
        return false;
      }
    }
    
    // 自治体フィルター
    if (filters.municipalities && Array.isArray(filters.municipalities)) {
      if (filters.municipalities.indexOf(ticket.municipality_name) === -1) {
        return false;
      }
    }
    
    // 日付範囲フィルター
    if (filters.dateRange) {
      var createdAt = new Date(ticket.created_at);
      if (filters.dateRange.from && createdAt < filters.dateRange.from) {
        return false;
      }
      if (filters.dateRange.to && createdAt > filters.dateRange.to) {
        return false;
      }
    }
    
    // キーワード検索
    if (filters.keyword) {
      var keyword = filters.keyword.toLowerCase();
      var searchText = [
        ticket.subject || '',
        ticket.description || '',
        ticket.case_category_name || '',
        ticket.municipality_name || ''
      ].join(' ').toLowerCase();
      
      if (searchText.indexOf(keyword) === -1) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * チケットデータをソート
 * @param {Array} tickets チケット配列
 * @param {Object} sortOptions ソートオプション
 * @return {Array} ソート済みチケット配列
 */
function sortTickets(tickets, sortOptions) {
  if (!Array.isArray(tickets)) {
    return [];
  }
  
  if (!sortOptions || !sortOptions.field) {
    // デフォルトは作成日の降順
    sortOptions = { field: 'created_at', order: 'desc' };
  }
  
  var sortedTickets = tickets.slice(); // コピーを作成
  
  sortedTickets.sort(function(a, b) {
    var aValue = getSortValue(a, sortOptions.field);
    var bValue = getSortValue(b, sortOptions.field);
    
    var comparison = 0;
    
    if (aValue < bValue) {
      comparison = -1;
    } else if (aValue > bValue) {
      comparison = 1;
    }
    
    // 降順の場合は結果を反転
    if (sortOptions.order === 'desc') {
      comparison = -comparison;
    }
    
    return comparison;
  });
  
  return sortedTickets;
}

/**
 * ソート用の値を取得
 * @param {Object} ticket チケットオブジェクト
 * @param {string} field ソートフィールド
 * @return {*} ソート用の値
 */
function getSortValue(ticket, field) {
  var value = ticket[field];
  
  // 日付フィールドの場合は Date オブジェクトに変換
  if (field === 'created_at' || field === 'updated_at') {
    return new Date(value || 0);
  }
  
  // 文字列フィールドの場合は小文字に変換
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  
  // その他の場合はそのまま返す（nullish な値は最後に並ぶよう調整）
  return value || '';
}

/**
 * チケットデータの重複を除去
 * @param {Array} tickets チケット配列
 * @param {string} keyField 重複判定に使用するフィールド（デフォルト: 'ticket_id'）
 * @return {Array} 重複除去済みチケット配列
 */
function deduplicateTickets(tickets, keyField) {
  if (!Array.isArray(tickets)) {
    return [];
  }
  
  keyField = keyField || 'ticket_id';
  var seen = {};
  var deduplicated = [];
  
  for (var i = 0; i < tickets.length; i++) {
    var ticket = tickets[i];
    var key = ticket[keyField];
    
    if (key && !seen[key]) {
      seen[key] = true;
      deduplicated.push(ticket);
    }
  }
  
  return deduplicated;
}

/**
 * チケットデータの統計情報を生成
 * @param {Array} tickets チケット配列
 * @return {Object} 統計情報オブジェクト
 */
function generateTicketStatistics(tickets) {
  if (!Array.isArray(tickets)) {
    return {
      total: 0,
      byStatus: {},
      byCategory: {},
      byMunicipality: {}
    };
  }
  
  var stats = {
    total: tickets.length,
    byStatus: {},
    byCategory: {},
    byMunicipality: {}
  };
  
  tickets.forEach(function(ticket) {
    // ステータス別集計
    var status = ticket.status || 'unknown';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    
    // カテゴリ別集計
    var category = ticket.case_category_name || 'uncategorized';
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    
    // 自治体別集計
    var municipality = ticket.municipality_name || 'unknown';
    stats.byMunicipality[municipality] = (stats.byMunicipality[municipality] || 0) + 1;
  });
  
  return stats;
}

/**
 * 自治体の設定データを正規化
 * @param {Object} municipalityConfig 自治体設定
 * @return {Object} 正規化された設定
 */
function normalizeMunicipalityConfig(municipalityConfig) {
  if (!municipalityConfig || typeof municipalityConfig !== 'object') {
    return null;
  }
  
  return {
    name: municipalityConfig.name || '',
    messageBoxId: municipalityConfig.messageBoxId || municipalityConfig.message_box_id || '',
    enabled: municipalityConfig.enabled !== false, // デフォルトtrue
    priority: municipalityConfig.priority || 'normal',
    tags: Array.isArray(municipalityConfig.tags) ? municipalityConfig.tags : [],
    settings: municipalityConfig.settings || {}
  };
}
