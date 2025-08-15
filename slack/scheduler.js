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
    
    // 各自治体の設定をチェック
    for (var i = 0; i < municipalityConfigs.length; i++) {
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
          console.log(config.name + ': 実行条件に不一致 - スキップ');
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
    
    // 時刻が一致しない場合は実行しない
    if (currentHour !== targetHour || currentMinute !== targetMinute) {
      return false;
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
  
  // HTMLダイアログを作成
  var htmlOutput = HtmlService.createHtmlOutput(`
    <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
      <h3>定期通知トリガー管理</h3>
      <p style="margin-bottom: 20px;"><strong>現在の状態:</strong> ${currentStatus}</p>
      
      <p style="margin-bottom: 30px;">
        トリガー設定を選択してください：<br><br>
        <strong>注意:</strong> 既存のトリガーは自動的に削除されます
      </p>
      
      <div style="margin: 20px 0;">
        <button onclick="setProduction()" style="
          background-color: #4CAF50; 
          color: white; 
          padding: 15px 25px; 
          margin: 5px; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer;
          font-size: 14px;
          min-width: 150px;
        ">🟢 本番設定<br><small>(1時間ごと)</small></button>
      </div>
      
      <div style="margin: 20px 0;">
        <button onclick="setTest()" style="
          background-color: #FF9800; 
          color: white; 
          padding: 15px 25px; 
          margin: 5px; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer;
          font-size: 14px;
          min-width: 150px;
        ">🔶 検証設定<br><small>(1分ごと)</small></button>
      </div>
      
      <div style="margin: 20px 0;">
        <button onclick="deleteTrigger()" style="
          background-color: #f44336; 
          color: white; 
          padding: 15px 25px; 
          margin: 5px; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer;
          font-size: 14px;
          min-width: 150px;
        ">🗑️ 削除<br><small>(通知停止)</small></button>
      </div>
      
      <div style="margin-top: 30px;">
        <button onclick="google.script.host.close()" style="
          background-color: #9E9E9E; 
          color: white; 
          padding: 10px 20px; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer;
        ">キャンセル</button>
      </div>
    </div>
    
    <script>
      function setProduction() {
        google.script.run
          .withSuccessHandler(() => {
            google.script.host.close();
          })
          .withFailureHandler((error) => {
            alert('エラーが発生しました: ' + error.message);
          })
          .setupProductionTrigger();
      }
      
      function setTest() {
        google.script.run
          .withSuccessHandler(() => {
            google.script.host.close();
          })
          .withFailureHandler((error) => {
            alert('エラーが発生しました: ' + error.message);
          })
          .setupTestTrigger();
      }
      
      function deleteTrigger() {
        google.script.run
          .withSuccessHandler(() => {
            google.script.host.close();
          })
          .withFailureHandler((error) => {
            alert('エラーが発生しました: ' + error.message);
          })
          .removeScheduledNotificationTrigger();
      }
    </script>
  `)
  .setWidth(400)
  .setHeight(450);

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
        // 時間ベースのトリガーの詳細を判定
        // GASでは直接間隔を取得できないため、作成時刻から推測
        return '🟢 設定済み（詳細は手動確認が必要）';
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
    
    // 新しいトリガーを作成（1時間ごと）
    ScriptApp.newTrigger('executeScheduledNotifications')
      .timeBased()
      .everyHours(1)
      .create();
    
    console.log('本番用トリガーを設定しました（1時間ごと）');
    
    var ui = SpreadsheetApp.getUi();
    var message = '本番用トリガー設定完了\n\n' +
      '🟢 実行間隔: 1時間ごと（本番環境）\n' +
      '📋 対象関数: executeScheduledNotifications\n';
    
    if (deletedCount > 0) {
      message += '\n🗑️ 既存トリガー削除: ' + deletedCount + '件\n';
    }
    
    message += '\n📮受信箱シートの「定期通知設定」列でスケジュールを設定してください。';
    
    ui.alert('設定完了', message, ui.ButtonSet.OK);
      
  } catch (error) {
    console.error('本番用トリガー設定エラー: ' + error.toString());
    showTriggerError('本番用トリガー設定', error);
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
    
    console.log('検証用トリガーを設定しました（1分ごと）');
    
    var ui = SpreadsheetApp.getUi();
    var message = '検証用トリガー設定完了\n\n' +
      '🔶 実行間隔: 1分ごと（検証環境）\n' +
      '📋 対象関数: executeScheduledNotifications\n';
    
    if (deletedCount > 0) {
      message += '\n🗑️ 既存トリガー削除: ' + deletedCount + '件\n';
    }
    
    message += '\n⚠️ 注意: 検証用設定です。実際のSlack通知が頻繁に送信されます。\n' +
               'テスト完了後は本番設定または削除を実行してください。';
    
    ui.alert('設定完了', message, ui.ButtonSet.OK);
      
  } catch (error) {
    console.error('検証用トリガー設定エラー: ' + error.toString());
    showTriggerError('検証用トリガー設定', error);
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
    if (triggers[i].getHandlerFunction() === 'executeScheduledNotifications') {
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
    
    console.log('定期通知トリガーを削除しました（' + deletedCount + '件）');
    
    var ui = SpreadsheetApp.getUi();
    if (deletedCount > 0) {
      ui.alert('トリガー削除完了', 
        '定期通知トリガーを削除しました。\n\n' +
        '🗑️ 削除件数: ' + deletedCount + '件\n\n' +
        '定期通知は停止されました。',
        ui.ButtonSet.OK);
    } else {
      ui.alert('削除対象なし', 
        '削除対象のトリガーが見つかりませんでした。\n\n' +
        'executeScheduledNotifications 関数のトリガーは設定されていません。',
        ui.ButtonSet.OK);
    }
      
  } catch (error) {
    console.error('トリガー削除エラー: ' + error.toString());
    showTriggerError('トリガー削除', error);
  }
}

/**
 * 定期通知のテスト実行
 * 手動でスケジューラーを実行してテスト
 */
function testScheduledNotifications() {
  var ui = SpreadsheetApp.getUi();
  
  var response = ui.alert('定期通知テスト実行', 
    'スケジューラーをテスト実行します。\n\n' +
    '注意: 実際にSlack通知が送信される可能性があります。\n' +
    '実行しますか？',
    ui.ButtonSet.YES_NO);
 
  if (response !== ui.Button.YES) {
    return;
  }
  
  try {
    console.log('=== 定期通知テスト実行開始 ===');
    executeScheduledNotifications();
    console.log('=== 定期通知テスト実行完了 ===');
    
    ui.alert('テスト完了', 
      '定期通知のテスト実行が完了しました。\n\n' +
      'ログを確認して結果をご確認ください。',
      ui.ButtonSet.OK);
      
  } catch (error) {
    console.error('定期通知テスト実行エラー: ' + error.toString());
    ui.alert('エラー', 
      '定期通知テスト実行中にエラーが発生しました：\n\n' + 
      error.toString(),
      ui.ButtonSet.OK);
  }
}
