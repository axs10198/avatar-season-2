const TOKEN = "avatar-season-two";
const SHEET_NAME = "Submissions";

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet_();
    const payload = parsePayload_(event);

    if (payload.token !== TOKEN) {
      return json_({ ok: false, error: "Invalid token" });
    }

    sheet.appendRow([
      new Date(),
      payload.eventName || "",
      payload.accepted === true || payload.accepted === "true",
      payload.day || "",
      payload.element || "",
      payload.madridDate || "",
      payload.madridTime || "",
      payload.shanghaiTime || "",
      payload.valid === true || payload.valid === "true",
      payload.reaction || "",
      payload.note || "",
      payload.pageUrl || "",
      payload.userAgent || "",
    ]);

    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, message: "Avatar quest endpoint is awake." });
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp",
      "Event",
      "Accepted",
      "Day",
      "Element",
      "Madrid Date",
      "Madrid Time",
      "Shanghai Time",
      "Valid",
      "Reaction",
      "Note",
      "Page URL",
      "User Agent",
    ]);
  }

  return sheet;
}

function parsePayload_(event) {
  if (!event || !event.postData || !event.postData.contents) {
    return {};
  }

  return JSON.parse(event.postData.contents);
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
