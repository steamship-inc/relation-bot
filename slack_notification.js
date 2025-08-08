/**
 * Slack通知メインファイル
 * 
 * このファイルは下位互換性のために残されています。
 * 実際の機能は slack/ ディレクトリに分割されています：
 * 
 * - slack/core.js     : メイン送信ロジックとAPI通信
 * - slack/message.js  : メッセージ作成とテンプレート管理
 * - slack/ui.js       : ユーザーインターフェース（ダイアログ等）
 * - slack/data.js     : データ取得とマッピング
 * 
 * 新しい構造により、コードの保守性と可読性が大幅に向上しました。
 * 各ファイルは特定の責任を持ち、独立して開発・テストできます。
 */

// === 下位互換性のためのプロキシ関数 ===
// これらの関数は slack/ ディレクトリの対応する関数を呼び出します

/**
 * 手動Slack送信関数（プロキシ）
 */
function manualSendSlack() {
  // slack/core.js の manualSendSlack を呼び出し
  return manualSendSlack();
}

/**
 * チケットデータ取得（プロキシ）
 */
function getTicketsFromSheet(messageBoxId) {
  // slack/data.js の getTicketsFromSheet を呼び出し
  return getTicketsFromSheet(messageBoxId);
}

/**
 * Slackメッセージ作成（プロキシ）
 */
function createSlackMessage(tickets, config) {
  // slack/message.js の createSlackMessage を呼び出し
  return createSlackMessage(tickets, config);
}

/**
 * Slack送信（プロキシ）
 */
function sendSlack(tickets, config) {
  // slack/core.js の sendSlack を呼び出し
  return sendSlack(tickets, config);
}

// === 移行ガイド ===
// 
// 新しいファイル構造を使用する場合：
// 1. slack/core.js から manualSendSlack を呼び出す
// 2. slack/data.js からデータ取得関数を使用
// 3. slack/message.js からメッセージ作成関数を使用
// 4. slack/ui.js からダイアログ関数を使用
//
// この移行により以下のメリットが得られます：
// - 1200行 → 各ファイル200-400行程度に分割
// - 機能ごとの責任分離
// - テストの容易性向上
// - 開発者の理解しやすさ向上
// - Git履歴の追跡性向上




