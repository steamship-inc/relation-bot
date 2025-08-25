/**
 * Slack通知スケジューラー
 * 定期的にSlack通知を送信する機能
 * 
 * 依存関係:
 * - slack/data-fetcher.js: getTicketsFromSheet()
 * - slack/notifications.js: sendSlackToMunicipality()
 * - relation/fetchMessageBoxes.js: 受信箱シート構造
 */

/**
 * 定期通知のマスタートリガー関数
 * 1時間ごとに実行され、各自治体の設定をチェックして通知を送信
 */
function executeScheduledNotifications() {
  console.log('=== 定期通知スケジューラー開始 ===');
  var startTime = new Date();
  var maxExecutionTime = 50000; // 50秒でタイムアウト
  
  try {
    // 現在の日時情報を取得
    var now = new Date();
    var currentHour = now.getHours();
    var currentMinute = now.getMinutes();
    var currentDay = now.getDay(); // 0=日曜日, 1=月曜日, ..., 6=土曜日
    var currentDate = now.getDate();
    var currentMonth = now.getMonth() + 1; // 0ベースなので+1
    
    console.log('現在時刻: ' + now.toLocaleString('ja-JP'));
    console.log('時刻: ' + currentHour + ':' + String(currentMinute).padStart(2, '0'));
    console.log('曜日: ' + currentDay + ' (0=日曜日)');
    
    // 受信箱シートから自治体設定を取得
    var municipalityConfigs = loadMunicipalityConfigsFromSheet();
    
    if (municipalityConfigs.length === 0) {
      console.log('自治体設定が見つかりません');
      return;
    }
    
    console.log('対象自治体数: ' + municipalityConfigs.length);
    
    var notificationCount = 0;
    var errorCount = 0;
    var skippedCount = 0; // タイムアウトでスキップした件数
    
    // 各自治体の設定をチェック
    for (var i = 0; i < municipalityConfigs.length; i++) {
      // 実行時間チェック
      var currentTime = new Date();
      if (currentTime - startTime > maxExecutionTime) {
        console.log('実行時間制限により処理を中断します。残り自治体数: ' + (municipalityConfigs.length - i));
        skippedCount = municipalityConfigs.length - i;
        break;
      }
      
      var config = municipalityConfigs[i];
      
      try {
        // cron設定が空の場合はスキップ
        if (!config.cronSchedule || config.cronSchedule.trim() === '') {
          console.log(config.name + ': 定期通知設定なし - スキップ');
          continue;
        }
        
        // cron設定をパースして実行条件をチェック
        var shouldExecute = checkCronSchedule(config.cronSchedule, currentHour, currentMinute, currentDay, currentDate, currentMonth);
        
        if (shouldExecute) {
          console.log(config.name + ': 定期通知実行条件に一致 - 通知送信開始');
          
          // チケットを取得
          var tickets = getTicketsFromSheet(config.messageBoxId);
          
          if (tickets.length === 0) {
            console.log(config.name + ': 対象チケットなし - 通知スキップ');
            continue;
          }
          
          // Slack通知を送信
          var isLast = (i === municipalityConfigs.length - 1);
          sendSlackToMunicipality(tickets, config, isLast);
          
          notificationCount++;
          console.log(config.name + ': 通知送信完了 (チケット数: ' + tickets.length + ')');
          
        } else {
          // console.log(config.name + ': 実行条件に不一致 - スキップ');
        }
        
      } catch (error) {
        console.error(config.name + ': 通知送信エラー - ' + error.toString());
        errorCount++;
      }
    }
    
    var endTime = new Date();
    var duration = Math.round((endTime - startTime) / 1000);
    
    console.log('=== 定期通知スケジューラー完了 ===');
    console.log('実行時間: ' + duration + '秒');
    console.log('通知送信数: ' + notificationCount);
    console.log('エラー数: ' + errorCount);
    if (skippedCount > 0) {
      console.log('⚠️ タイムアウトによりスキップされた自治体数: ' + skippedCount);
    }
    
  } catch (error) {
    console.error('定期通知スケジューラーでエラー発生: ' + error.toString());
  }
}

/**
 * 受信箱シートから自治体設定を読み込み
 * @return {Array} 自治体設定配列
 */
function loadMunicipalityConfigsFromSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName('📮受信箱');
    
    if (!configSheet) {
      console.log('📮受信箱シートが見つかりません');
      return [];
    }
    
    var data = configSheet.getDataRange().getValues();
    
    if (data.length <= 5) { // ヘッダー行（5行目）を除く
      console.log('📮受信箱シートにデータがありません');
      return [];
    }
    
    var configs = [];
    
    // データ行をループ（6行目以降、0ベースで5以降）
    for (var i = 5; i < data.length; i++) {
      var row = data[i];
      
      // 必須項目チェック
      if (row[0] && row[1] && row[3] && row[4]) { // 自治体ID、自治体名、受信箱ID、Slackチャンネル
        
        // Slack通知テンプレートをパース
        var slackTemplate = {};
        try {
          if (row[5] && row[5].trim() !== '') {
            slackTemplate = JSON.parse(row[5]);
          }
        } catch (e) {
          console.log('Slackテンプレート解析エラー (' + row[1] + '): ' + e.toString());
          slackTemplate = {}; // デフォルトテンプレートを使用
        }
        
        // Slack通知フィルタをパース
        var slackNotificationFilter = {};
        try {
          if (row[6] && row[6].trim() !== '') {
            slackNotificationFilter = JSON.parse(row[6]);
          }
        } catch (e) {
          console.log('Slackフィルタ解析エラー (' + row[1] + '): ' + e.toString());
          slackNotificationFilter = {}; // デフォルトフィルタを使用
        }
        
        var config = {
          municipalityId: row[0],           // A列: 自治体ID
          name: row[1],                     // B列: 自治体名
          prefecture: row[2] || '',         // C列: 都道府県
          messageBoxId: row[3],             // D列: 受信箱ID
          slackChannel: row[4],             // E列: Slackチャンネル
          slackTemplate: slackTemplate,     // F列: Slack通知テンプレート(JSON)
          slackNotificationFilter: slackNotificationFilter, // G列: Slack通知フィルタ(JSON)
          cronSchedule: row[7] || ''        // H列: 定期通知設定
        };
        
        configs.push(config);
      }
    }
    
    console.log('受信箱シートから ' + configs.length + '件の自治体設定を読み込みました');
    return configs;
    
  } catch (error) {
    console.error('受信箱シート読み込みエラー: ' + error.toString());
    return [];
  }
}

/**
 * cron設定をチェックして実行条件に一致するかを判定
 * @param {string} cronSchedule cron設定文字列
 * @param {number} currentHour 現在の時
 * @param {number} currentMinute 現在の分
 * @param {number} currentDay 現在の曜日 (0=日曜日)
 * @param {number} currentDate 現在の日
 * @param {number} currentMonth 現在の月
 * @return {boolean} 実行条件に一致するかどうか
 */
function checkCronSchedule(cronSchedule, currentHour, currentMinute, currentDay, currentDate, currentMonth) {
  try {
    // シンプルなcron形式をサポート
    // 例:
    // "9:00 daily" - 毎日9時
    // "14:30 weekdays" - 平日14時30分
    // "10:00 mon,wed,fri" - 月水金の10時
    // "8:00 monthly" - 毎月1日8時
    
    cronSchedule = cronSchedule.trim().toLowerCase();
    
    // 時刻部分を抽出
    var timeMatch = cronSchedule.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) {
      console.log('無効な時刻形式: ' + cronSchedule);
      return false;
    }
    
    var targetHour = parseInt(timeMatch[1]);
    var targetMinute = parseInt(timeMatch[2]);
    
    // トリガータイプによって時刻チェック方法を変更
    var triggerType = PropertiesService.getScriptProperties().getProperty('triggerType');
    
    if (triggerType === 'test') {
      // テスト用: 時刻と分を厳密にチェック（設定時刻と完全一致）
      if (currentHour !== targetHour || currentMinute !== targetMinute) {
        return false;
      }
      console.log('設定時刻: ' + targetHour + ':' + String(targetMinute).padStart(2, '0') + 
                  ', 実行時刻: ' + currentHour + ':' + String(currentMinute).padStart(2, '0') + 
                  ' (テスト用: 時分厳密チェック)');
    } else {
      // 本番用: 同じ時間帯なら実行（9時設定なら9時台のいつでも）
      if (currentHour < targetHour || currentHour >= targetHour + 1) {
        return false;
      }
      console.log('設定時刻: ' + targetHour + ':' + String(targetMinute).padStart(2, '0') + 
                  ', 実行時刻: ' + currentHour + ':' + String(currentMinute).padStart(2, '0') + 
                  ' (本番用: ' + targetHour + '時台で実行)');
    }
    
    // 頻度部分を抽出
    var frequencyPart = cronSchedule.replace(/\d{1,2}:\d{2}\s*/, '').trim();
    
    if (frequencyPart === 'daily' || frequencyPart === '') {
      // 毎日実行
      return true;
    } else if (frequencyPart === 'weekdays') {
      // 平日のみ（月-金）
      return currentDay >= 1 && currentDay <= 5;
    } else if (frequencyPart === 'weekends') {
      // 週末のみ（土日）
      return currentDay === 0 || currentDay === 6;
    } else if (frequencyPart === 'monthly') {
      // 毎月1日
      return currentDate === 1;
    } else if (frequencyPart.includes(',')) {
      // 特定の曜日指定 (例: mon,wed,fri)
      var dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      var targetDays = frequencyPart.split(',').map(function(day) {
        return day.trim();
      });
      
      var currentDayName = dayNames[currentDay];
      return targetDays.indexOf(currentDayName) !== -1;
    } else {
      console.log('未対応の頻度指定: ' + frequencyPart);
      return false;
    }
    
  } catch (error) {
    console.error('cron設定解析エラー: ' + error.toString());
    return false;
  }
}

/**
 * 定期通知トリガー管理
 * 本番用・検証用・削除を選択できる統合メニュー
 */
function manageScheduledNotificationTrigger() {
  var ui = SpreadsheetApp.getUi();
  
  // 現在のトリガー状態を確認
  var currentStatus = getCurrentTriggerStatus();
  
  // テンプレートにデータを渡してHTMLダイアログを作成
  var template = HtmlService.createTemplateFromFile('slack/scheduler/trigger-management');
  template.currentStatus = currentStatus;
  
  var htmlOutput = template.evaluate()
    .setWidth(400)
    .setHeight(500);

  ui.showModalDialog(htmlOutput, '定期通知トリガー管理');
}

/**
 * 現在のトリガー状態を取得
 */
function getCurrentTriggerStatus() {
  var triggers = ScriptApp.getProjectTriggers();
  
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'executeScheduledNotifications') {
      var trigger = triggers[i];
      
      if (trigger.getEventType() === ScriptApp.EventType.CLOCK) {
        // トリガーの作成時間から推測（完璧ではないが、実用的）
        var now = new Date();
        var triggerTime = trigger.getUniqueId(); // 作成順で推測
        
        // プロパティサービスで設定タイプを記録・取得
        var triggerType = PropertiesService.getScriptProperties().getProperty('triggerType');
        
        if (triggerType === 'production') {
          return '🟢 本番用(1時間ごと)';
        } else if (triggerType === 'test') {
          return '🔶 検証用(1分ごと)';
        } else {
          return '🟢 設定済み（種類不明）';
        }
      }
    }
  }
  
  return '❌ 未設定';
}

/**
 * 本番用トリガーを設定（1時間ごと）
 */
function setupProductionTrigger() {
  try {
    // 既存のトリガーを全て削除
    var deletedCount = removeExistingTriggers();

    // 現在時刻を取得
    var now = new Date();
    console.log('setupProductionTrigger実行時刻: ' + now.toLocaleString('ja-JP'));

    // initializeHourlyTriggerをすぐに実行
    initializeHourlyTrigger();

    console.log('本番用トリガーの初期化を即座に実行しました');
    return { success: true, type: 'production' };

  } catch (error) {
    console.error('本番用トリガー設定エラー: ' + error.toString());
    throw error;
  }
}

/**
 * 1時間ごとのトリガーを初期化
 */
function initializeHourlyTrigger() {
  try {
    // 一度きりのトリガーを削除
    removeExistingTriggers();

    // 現在時刻をログに記録
    var now = new Date();
    console.log('initializeHourlyTrigger 実行時刻: ' + now.toLocaleString('ja-JP'));

    // 次の00分の時刻を計算
    var nextHour = new Date();
    nextHour.setMinutes(0, 0, 0); // 分、秒、ミリ秒を0に設定
    
    // 現在時刻が「00分」を過ぎている場合、次の時間に設定
    if (nextHour <= now) {
      nextHour.setHours(nextHour.getHours() + 1);
    }
    
    console.log('次回setupRecurringTrigger実行予定時刻: ' + nextHour.toLocaleString('ja-JP'));

    // 次の00分に実行される一度きりのトリガーを作成
    ScriptApp.newTrigger('setupRecurringTrigger')
      .timeBased()
      .at(nextHour)
      .create();

    console.log('setupRecurringTriggerのトリガーを設定しました');

  } catch (error) {
    console.error('1時間ごとのトリガー初期化エラー: ' + error.toString());
    throw error;
  }
}

/**
 * 定期的なトリガーを設定（毎回00分に実行される）
 */
function setupRecurringTrigger() {
  try {
    // 一度きりのトリガーを削除
    removeExistingTriggers();

    // 現在時刻をログに記録
    var now = new Date();
    console.log('setupRecurringTrigger 実行時刻: ' + now.toLocaleString('ja-JP'));

    // 1時間ごとのトリガーを作成
    ScriptApp.newTrigger('executeScheduledNotifications')
      .timeBased()
      .everyHours(1)
      .create();

    // 設定タイプを記録
    PropertiesService.getScriptProperties().setProperty('triggerType', 'production');

    console.log('1時間ごとのトリガーを設定しました');

  } catch (error) {
    console.error('定期トリガー設定エラー: ' + error.toString());
    throw error;
  }
}

/**
 * 検証用トリガーを設定（1分ごと）
 */
function setupTestTrigger() {
  try {
    // 既存のトリガーを全て削除
    var deletedCount = removeExistingTriggers();
    
    // 新しいトリガーを作成（1分ごと）
    ScriptApp.newTrigger('executeScheduledNotifications')
      .timeBased()
      .everyMinutes(1)
      .create();
    
    // 設定タイプを記録
    PropertiesService.getScriptProperties().setProperty('triggerType', 'test');
    
    console.log('検証用トリガーを設定しました（1分ごと）');
    return { success: true, type: 'test' };
      
  } catch (error) {
    console.error('検証用トリガー設定エラー: ' + error.toString());
    throw error;
  }
}

/**
 * 既存のトリガーを削除（内部関数）
 * @return {number} 削除されたトリガー数
 */
function removeExistingTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var deletedCount = 0;
  
  for (var i = 0; i < triggers.length; i++) {
    var handlerFunction = triggers[i].getHandlerFunction();
    if (handlerFunction === 'executeScheduledNotifications' || 
        handlerFunction === 'initializeHourlyTrigger' ||
        handlerFunction === 'setupRecurringTrigger') {
      ScriptApp.deleteTrigger(triggers[i]);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    console.log('既存のトリガーを削除しました（' + deletedCount + '件）');
  }
  
  return deletedCount;
}

/**
 * エラー表示用ヘルパー関数
 */
function showTriggerError(operation, error) {
  var ui = SpreadsheetApp.getUi();
  ui.alert('エラー', 
    operation + '中にエラーが発生しました：\n\n' + 
    error.toString(),
    ui.ButtonSet.OK);
}

/**
 * 定期通知トリガーを削除
 */
function removeScheduledNotificationTrigger() {
  try {
    var deletedCount = removeExistingTriggers();
    
    // 設定タイプをクリア
    PropertiesService.getScriptProperties().deleteProperty('triggerType');
    
    console.log('定期通知トリガーを削除しました（' + deletedCount + '件）');
    return { success: true, deletedCount: deletedCount };
      
  } catch (error) {
    console.error('トリガー削除エラー: ' + error.toString());
    throw error;
  }
}

