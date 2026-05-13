var SHEET_NAMES = {
	SETTINGS: "Settings",
	SENSOR_LOG: "SensorLog",
	OPERATION_LOG: "OperationLog",
	ERROR_LOG: "ErrorLog"
};

function getSettings() {
	var sheet = getSheetByName_(SHEET_NAMES.SETTINGS);
	var values = sheet.getRange("B2:B11").getValues().map(function (row) {
		return row[0];
	});

	return {
		tempMin: Number(values[0] || 22),
		tempMax: Number(values[1] || 23),
		humidityThreshold: Number(values[2] || 70),
		notifyStart: Number(values[3] || 7),
		notifyEnd: Number(values[4] || 23),
		notifyInterval: Number(values[5] || 60),
		remoToken: String(values[6] || "").trim(),
		discordUrl: String(values[7] || "").trim(),
		deviceName: String(values[8] || "").trim(),
		highTempAlertThreshold: Number(values[9] || 35)
	};
}

function appendSensorLog(timestamp, temp, humidity, illuminance, discomfortIndex, acState) {
	var sheet = getSheetByName_(SHEET_NAMES.SENSOR_LOG);
	sheet.appendRow([timestamp, temp, humidity, illuminance, discomfortIndex, acState]);
}

function appendOperationLog(timestamp, operation, temp, humidity, di, result, errorDetail) {
	var sheet = getSheetByName_(SHEET_NAMES.OPERATION_LOG);
	sheet.appendRow([timestamp, operation, temp, humidity, di, result, errorDetail]);
}

function getCurrentAcState() {
	var sheet = getSheetByName_(SHEET_NAMES.SENSOR_LOG);
	var lastRow = sheet.getLastRow();
	if (lastRow < 2) {
		return "停止";
	}

	var value = sheet.getRange(lastRow, 6).getValue();
	return value ? String(value) : "停止";
}

function getLastNotifiedTime() {
	var raw = PropertiesService.getScriptProperties().getProperty("LAST_NOTIFIED_TIME");
	return raw ? new Date(raw) : null;
}

function setLastNotifiedTime(timestamp) {
	PropertiesService.getScriptProperties().setProperty("LAST_NOTIFIED_TIME", timestamp.toISOString());
}

function getSheetByName_(name) {
	var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
	if (!sheet) {
		throw new Error("Sheet not found: " + name);
	}
	return sheet;
}

// ===== エラーハンドリング機能 =====

/**
 * APIエラーをシートに記録
 * @param {Date} timestamp - エラー発生日時
 * @param {string} apiName - 対象API名（例: "Nature Remo", "Discord"）
 * @param {string} errorDetail - エラーの詳細内容
 */
function appendErrorLog(timestamp, apiName, errorDetail) {
	try {
		var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.ERROR_LOG);
		if (!sheet) {
			// ErrorLog シートが存在しない場合は作成
			sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAMES.ERROR_LOG);
			sheet.appendRow(["発生日時", "対象API", "エラー内容"]);
		}
		
		sheet.appendRow([timestamp, apiName, errorDetail]);
	} catch (e) {
		Logger.log("appendErrorLog error: " + e);
	}
}

/**
 * 最近のエラーログを取得（直近10件）
 * @returns {Array} エラーログの配列
 */
function getRecentErrors(limit) {
	try {
		if (!limit) limit = 10;
		var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.ERROR_LOG);
		if (!sheet || sheet.getLastRow() < 2) {
			return [];
		}
		
		var lastRow = sheet.getLastRow();
		var startRow = Math.max(2, lastRow - limit + 1);
		var values = sheet.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues();
		
		return values.map(function (row) {
			return {
				timestamp: row[0],
				apiName: row[1],
				errorDetail: row[2]
			};
		});
	} catch (e) {
		Logger.log("getRecentErrors error: " + e);
		return [];
	}
}
