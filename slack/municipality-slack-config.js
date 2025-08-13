/**
 * municipality-slack-config.js
 * 
 * 自治体Slack設定管理モジュール
 * 自治体ごとのSlack通知設定の解析と管理を担当
 * 
 * 主要関数:
 * - parseSlackNotificationFilter(jsonString): Slack通知フィルタ条件解析
 */

/**
 * Slack通知フィルタ条件JSON文字列をパース
 * @param {string} jsonString JSON文字列
 * @return {Object} Slack通知フィルタ条件オブジェクト
 */
function parseSlackNotificationFilter(jsonString) {
  if (!jsonString) {
    // デフォルトはフィルタなし（全チケット通知）
    return null;
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Slack通知フィルタ条件の解析に失敗しました: ' + error.toString());
    // エラー時はフィルタなし
    return null;
  }
}
