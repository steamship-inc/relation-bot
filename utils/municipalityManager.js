/**
 * 自治体設定管理モジュール
 * municipality_config.jsから抽出した設定管理機能
 */

/**
 * 全自治体の設定を取得
 * @return {Array} 自治体設定配列
 */
function getAllMunicipalityConfigs() {
  return [
    createMunicipalityConfig('札幌市', 'J1k1OA0-eI9YHMhKYKqgQ', true),
    createMunicipalityConfig('青森市', 'eUF3OQnF1gBdKR-qdWMNW', true),
    createMunicipalityConfig('盛岡市', 'YsaDdCAhXvZTwgw-6h5vX', true),
    createMunicipalityConfig('仙台市', 'nv2rOzAqZOZXl8qSFfhH3', true),
    createMunicipalityConfig('秋田市', 'o8_AE5tqpJvGvX8K0cgXP', true),
    createMunicipalityConfig('山形市', 'l1qIq4W9E3HfKMKojCjB6', true),
    createMunicipalityConfig('福島市', 'Y0iVl5hpOhzXZPf-b8eSN', true),
    createMunicipalityConfig('水戸市', 'UQKqKl1FU5T-yRAzPU2rl', true),
    createMunicipalityConfig('宇都宮市', 'fUeNdNkNVhU-m2e6vxQWp', true),
    createMunicipalityConfig('前橋市', 'wILFjT7WuwVVdFBT-lqNA', true),
    createMunicipalityConfig('さいたま市', 'NJaUNsQqyW9Y7POkYp2jC', true),
    createMunicipalityConfig('千葉市', 'EG3Fz0jMelzB1qJ4jElL0', true),
    createMunicipalityConfig('新宿区', 'YOlODqZsZfq-LVTlP8Rfl', true),
    createMunicipalityConfig('横浜市', '3kWELG5VNjuIrWkwBPOo8', true),
    createMunicipalityConfig('新潟市', '3ZtfmfOyAOJGKJYcDDCHj', true),
    createMunicipalityConfig('富山市', 'yHF9hqTLg5UwMSb7Lj5QI', true),
    createMunicipalityConfig('金沢市', 'RVgMhQg8X3LNd0yJOuUhm', true),
    createMunicipalityConfig('福井市', 'ZAEAokGKJRSqAwqDcS4SU', true),
    createMunicipalityConfig('甲府市', 'Rm2dUfZEvAGEJg5vB3-JE', true),
    createMunicipalityConfig('長野市', 'hJWO0g9-dFDu9xJvL7cYx', true),
    createMunicipalityConfig('岐阜市', 'kB93qBzUJcKfU2IDRF6A6', true),
    createMunicipalityConfig('静岡市', 'OcZ7cF9fG_OGDnWJQ5nqo', true),
    createMunicipalityConfig('名古屋市', 'rYX0d2LT0vbGcFEOtx2fF', true),
    createMunicipalityConfig('津市', 'wUUn60P6K1bqD3LPf4j6U', true),
    createMunicipalityConfig('大津市', '5Y9u11j_1Q7fHOC5YR97y', true),
    createMunicipalityConfig('京都市', 'XQ1jGOFFD4oOEfqf-iWmC', true),
    createMunicipalityConfig('大阪市', 'VT0LCEt6CQxX9AqaNJAPV', true),
    createMunicipalityConfig('神戸市', 'aWH8wMBWTL4fB6FPPiG8v', true),
    createMunicipalityConfig('奈良市', 'Wfb6xkr5L8xDz9KJI-jMT', true),
    createMunicipalityConfig('和歌山市', 'qDsKGsb5gG-EbLqKbhZUE', true),
    createMunicipalityConfig('鳥取市', 'qL8u5fSJoFm0wV3tOT5G7', true),
    createMunicipalityConfig('松江市', 'BGJf6QfKhMd5bJjnRFUk6', true),
    createMunicipalityConfig('岡山市', 'OVfmF9LLDNMBlVAVlPF6R', true),
    createMunicipalityConfig('広島市', 'DnqE-6m6qN6R7l4cZi6Pk', true),
    createMunicipalityConfig('山口市', 'oUhHNEjzDLBW7wqQFkGEz', true),
    createMunicipalityConfig('徳島市', 'O8Nf6m-OMEfJNF8KQ7KmA', true),
    createMunicipalityConfig('高松市', 'jTKEd6Q2OLhSoYKQWUfUl', true),
    createMunicipalityConfig('松山市', 'O6fwSJdDT5PLQVFcDVPOC', true),
    createMunicipalityConfig('高知市', '5bAYmm1tBPPm4wYnIxTNc', true),
    createMunicipalityConfig('福岡市', 'G8NJ1gLSP0zFuqqTJA4k2', true),
    createMunicipalityConfig('佐賀市', 'qx7mQg1dE1RA8w0MrUKjj', true),
    createMunicipalityConfig('長崎市', 'nMH8H8PEQZlJTOqPwRfG1', true),
    createMunicipalityConfig('熊本市', 'FXJDQcOF8UzAUOPg14zQo', true),
    createMunicipalityConfig('大分市', 'JpJKqF9LI1KPU3j1LcqiY', true),
    createMunicipalityConfig('宮崎市', 'LbH8U8JQ8iONH5fWM6NXK', true),
    createMunicipalityConfig('鹿児島市', 'GnVQ8nJQjZkPOyKQOHPUU', true),
    createMunicipalityConfig('那覇市', 'lN8JTQjhLU9F5cKFO8fVm', true),
    createMunicipalityConfig('札幌市南区', 'L5tXU9PLTM-c7KqcL6qXW', true),
    createMunicipalityConfig('千代田区', 'P9qTUJJhLOzPUcqKO7P6K', true),
    createMunicipalityConfig('港区', 'nF1kK5fQ8YPK-qYqkHPF3', true),
    createMunicipalityConfig('八王子市', 'v5fV6bM8ULl_qOZO6_TQo', true),
    createMunicipalityConfig('町田市', 'aXUH8wT6LvKTf-nK9T9PK', true),
    createMunicipalityConfig('多摩市', 'JqLJ8TH0OoTq9KPOyJ9QO', true)
  ];
}

/**
 * 自治体設定オブジェクトを作成
 * @param {string} name 自治体名
 * @param {string} messageBoxId メッセージボックスID
 * @param {boolean} enabled 有効フラグ
 * @param {Object} options 追加オプション
 * @return {Object} 自治体設定オブジェクト
 */
function createMunicipalityConfig(name, messageBoxId, enabled, options) {
  options = options || {};
  
  return {
    name: name,
    messageBoxId: messageBoxId,
    enabled: enabled !== false,
    priority: options.priority || 'normal',
    tags: options.tags || [],
    settings: options.settings || {},
    region: options.region || detectRegion(name),
    population: options.population || null,
    lastUpdated: options.lastUpdated || new Date().toISOString()
  };
}

/**
 * 自治体名から地域を推測
 * @param {string} municipalityName 自治体名
 * @return {string} 地域名
 */
function detectRegion(municipalityName) {
  var regionMap = {
    '北海道': ['札幌'],
    '東北': ['青森', '盛岡', '仙台', '秋田', '山形', '福島'],
    '関東': ['水戸', '宇都宮', '前橋', 'さいたま', '千葉', '新宿', '千代田', '港', '八王子', '町田', '多摩', '横浜'],
    '中部': ['新潟', '富山', '金沢', '福井', '甲府', '長野', '岐阜', '静岡', '名古屋'],
    '近畿': ['津', '大津', '京都', '大阪', '神戸', '奈良', '和歌山'],
    '中国': ['鳥取', '松江', '岡山', '広島', '山口'],
    '四国': ['徳島', '高松', '松山', '高知'],
    '九州': ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '那覇']
  };
  
  for (var region in regionMap) {
    var cities = regionMap[region];
    for (var i = 0; i < cities.length; i++) {
      if (municipalityName.indexOf(cities[i]) !== -1) {
        return region;
      }
    }
  }
  
  return 'その他';
}

/**
 * 有効な自治体設定のみを取得
 * @return {Array} 有効な自治体設定配列
 */
function getEnabledMunicipalities() {
  return getAllMunicipalityConfigs().filter(function(config) {
    return config.enabled === true;
  });
}

/**
 * 特定の地域の自治体設定を取得
 * @param {string} region 地域名
 * @return {Array} 地域の自治体設定配列
 */
function getMunicipalitiesByRegion(region) {
  return getAllMunicipalityConfigs().filter(function(config) {
    return config.region === region;
  });
}

/**
 * 自治体名からメッセージボックスIDを取得
 * @param {string} municipalityName 自治体名
 * @return {string|null} メッセージボックスID
 */
function getMessageBoxIdByMunicipalityName(municipalityName) {
  var configs = getAllMunicipalityConfigs();
  
  for (var i = 0; i < configs.length; i++) {
    if (configs[i].name === municipalityName) {
      return configs[i].messageBoxId;
    }
  }
  
  return null;
}

/**
 * メッセージボックスIDから自治体名を取得
 * @param {string} messageBoxId メッセージボックスID
 * @return {string|null} 自治体名
 */
function getMunicipalityNameByMessageBoxId(messageBoxId) {
  var configs = getAllMunicipalityConfigs();
  
  for (var i = 0; i < configs.length; i++) {
    if (configs[i].messageBoxId === messageBoxId) {
      return configs[i].name;
    }
  }
  
  return null;
}

/**
 * 自治体設定の検証
 * @param {Object} config 自治体設定オブジェクト
 * @return {Object} 検証結果
 */
function validateMunicipalityConfig(config) {
  var errors = [];
  var warnings = [];
  
  // 必須フィールドのチェック
  if (!config.name || typeof config.name !== 'string') {
    errors.push('自治体名が設定されていません');
  }
  
  if (!config.messageBoxId || typeof config.messageBoxId !== 'string') {
    errors.push('メッセージボックスIDが設定されていません');
  }
  
  // メッセージボックスIDの形式チェック（簡易）
  if (config.messageBoxId && !/^[a-zA-Z0-9_-]+$/.test(config.messageBoxId)) {
    warnings.push('メッセージボックスIDの形式が一般的ではありません: ' + config.messageBoxId);
  }
  
  // 重複チェック
  var allConfigs = getAllMunicipalityConfigs();
  var nameCount = allConfigs.filter(function(c) { return c.name === config.name; }).length;
  var idCount = allConfigs.filter(function(c) { return c.messageBoxId === config.messageBoxId; }).length;
  
  if (nameCount > 1) {
    warnings.push('同じ自治体名が複数存在します: ' + config.name);
  }
  
  if (idCount > 1) {
    errors.push('同じメッセージボックスIDが複数存在します: ' + config.messageBoxId);
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

/**
 * 全自治体設定の検証
 * @return {Object} 検証結果の概要
 */
function validateAllMunicipalityConfigs() {
  var allConfigs = getAllMunicipalityConfigs();
  var results = {
    total: allConfigs.length,
    valid: 0,
    invalid: 0,
    warnings: 0,
    details: []
  };
  
  allConfigs.forEach(function(config) {
    var validation = validateMunicipalityConfig(config);
    
    results.details.push({
      name: config.name,
      validation: validation
    });
    
    if (validation.isValid) {
      results.valid++;
    } else {
      results.invalid++;
    }
    
    if (validation.warnings.length > 0) {
      results.warnings++;
    }
  });
  
  return results;
}

/**
 * 自治体設定の統計情報を取得
 * @return {Object} 統計情報
 */
function getMunicipalityStatistics() {
  var configs = getAllMunicipalityConfigs();
  var stats = {
    total: configs.length,
    enabled: 0,
    disabled: 0,
    byRegion: {},
    byPriority: {}
  };
  
  configs.forEach(function(config) {
    // 有効/無効カウント
    if (config.enabled) {
      stats.enabled++;
    } else {
      stats.disabled++;
    }
    
    // 地域別カウント
    var region = config.region || 'その他';
    stats.byRegion[region] = (stats.byRegion[region] || 0) + 1;
    
    // 優先度別カウント
    var priority = config.priority || 'normal';
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
  });
  
  return stats;
}
