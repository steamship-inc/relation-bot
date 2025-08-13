/**
 * Slack機能のメニューラッパー関数
 * menu.js から slack/ ディレクトリの関数を呼び出すため
 */

/**
 * メニューからSlack手動送信を呼び出す
 */
function slack_manualSendSlack() {
  // slack/core.js の manualSendSlack を呼び出し
  return manualSendSlack();
}
