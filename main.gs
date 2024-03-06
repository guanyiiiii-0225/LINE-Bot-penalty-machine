function doPost(e) {
  var CHANNEL_ACCESS_TOKEN = "line_bot_channel_access_token"; // line bot developer 那邊申請
  var msg = JSON.parse(e.postData.contents);

  // 取出 replayToken 和發送的訊息文字
  var replyToken = msg.events[0].replyToken;
  var userMessage = msg.events[0].message.text;
  var userId = msg.events[0].source.userId; // 取得個人userId
  const GARY_USER_ID = "gary_line_user_id"; // 要先串 line bot 取得自己的 line user id
  const ZOE_USER_ID = "zoe_line_user_id"; // 要先串 line bot 取得自己的 line user id

  const sheet_url = "your_google_sheet_url"; // google sheet url 要設公開
  const sheet_name = "your_sheet_name"; // 工作表名稱(預設應該是工作表一)
  const spreadSheet = SpreadsheetApp.openByUrl(sheet_url);
  var sheet = spreadSheet.getActiveSheet();
  const reserve_list = spreadSheet.getSheetByName(sheet_name);

  var current_timestamp = Utilities.formatDate(
    new Date(),
    "Asia/Taipei",
    "yyyy-MM-dd HH:mm"
  );

  // 回覆訊息給使用者
  function replyMsg(msg) {
    var url = "https://api.line.me/v2/bot/message/reply";
    UrlFetchApp.fetch(url, {
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: "Bearer " + CHANNEL_ACCESS_TOKEN,
      },
      method: "post",
      payload: JSON.stringify({
        replyToken: replyToken,
        messages: msg,
      }),
    });
  }

  // 發送訊息
  function pushMsg(msg, usrId) {
    var url = "https://api.line.me/v2/bot/message/push";
    UrlFetchApp.fetch(url, {
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: "Bearer " + CHANNEL_ACCESS_TOKEN,
      },
      method: "post",
      payload: JSON.stringify({
        to: usrId,
        messages: msg,
      }),
    });
  }

  // 將輸入值 word 轉為 LINE 文字訊息格式之 JSON
  function format_text_message(word) {
    let text_json = [
      {
        type: "text",
        text: word,
      },
    ];
    return text_json;
  }

  function record_to_sheet(name) {
    var current_list_row = reserve_list.getLastRow();
    reserve_list.getRange(current_list_row + 1, 2).setValue(name);
    reserve_list.getRange(current_list_row + 1, 1).setValue(current_timestamp);
  }

  function notifictaion_to_bad_people(usrId, usrName) {
    reply_message = format_text_message(
      "增加一筆" + usrName + "罵髒話的紀錄！"
    );
    pushMsg(reply_message, usrId);
    reply_message = format_text_message("不要再罵髒話了喔🥰");
    pushMsg(reply_message, usrId);
  }

  function notification_clear(clear_usrId) {
    notification_to_another_people(
      clear_usrId,
      "肉伊清空了紀錄！",
      "蓋瑞清空了紀錄！"
    );
  }

  function notification_to_another_people(
    self_usrId,
    message_to_gary,
    message_to_zoe
  ) {
    if (self_usrId == ZOE_USER_ID) {
      reply_message = format_text_message(message_to_gary);
      pushMsg(reply_message, GARY_USER_ID);
    } else {
      reply_message = format_text_message(message_to_zoe);
      pushMsg(reply_message, ZOE_USER_ID);
    }
  }

  if (typeof replyToken === "undefined") {
    return;
  }

  if (userMessage == "蓋瑞罵髒話") {
    record_to_sheet("蓋瑞");

    reply_message = format_text_message("收到：" + userMessage);
    replyMsg(reply_message);

    notifictaion_to_bad_people(GARY_USER_ID, "蓋瑞");
  } else if (userMessage == "肉伊罵髒話") {
    record_to_sheet("肉伊");

    reply_message = format_text_message("收到：" + userMessage);
    replyMsg(reply_message);

    notifictaion_to_bad_people(ZOE_USER_ID, "肉伊");
  } else if (userMessage == "統計") {
    var current_list_row = reserve_list.getLastRow();
    if (current_list_row < 2) {
      reply_message = format_text_message("還沒有人罵髒話喔，真棒🤩");
      replyMsg(reply_message);
      return;
    }
    var sheetData = sheet.getSheetValues(2, 2, current_list_row - 1, 1);
    var index = 0;
    var zoeAccumulatedPenalty = 0;
    var garyAccumulatedPenalty = 0;
    while (index < current_list_row - 1) {
      if (sheetData[index][0] == "肉伊") {
        zoeAccumulatedPenalty += 1;
      } else {
        garyAccumulatedPenalty += 1;
      }
      index++;
    }

    reply_message = format_text_message(
      "👉 統計 👈\n肉伊：" +
        zoeAccumulatedPenalty +
        "次\n" +
        "蓋瑞：" +
        garyAccumulatedPenalty +
        "次"
    );
    replyMsg(reply_message);
    reply_message = format_text_message("要結算的話，請輸入「歸零」！");
    pushMsg(reply_message, userId);
  } else if (userMessage == "歸零") {
    var current_list_row = reserve_list.getLastRow();
    if (current_list_row < 2) {
      reply_message = format_text_message("清空紀錄完畢！");
      replyMsg(reply_message);
      notification_clear(userId);
      return;
    }
    sheet.deleteRows(2, current_list_row - 1);
    reply_message = format_text_message("清空紀錄完畢！");
    replyMsg(reply_message);
    notification_clear(userId);
  } else {
    reply_message = format_text_message(
      "⚠️只接受以下指令:\n\n1️⃣蓋瑞罵髒話\n2️⃣肉伊罵髒話\n3️⃣統計\n4️⃣歸零\n\n更多的只能等肉伊慢慢開發（💡小彩蛋上市中..."
    );
    replyMsg(reply_message);
  }
}
