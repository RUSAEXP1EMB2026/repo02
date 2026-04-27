var SHEET_NAMES = {
	SETTINGS: "Settings",
	SENSOR_LOG: "SensorLog",
	OPERATION_LOG: "OperationLog"
};

function getSettings() {
	var sheet = getSheetByName_(SHEET_NAMES.SETTINGS);
	var values = sheet.getRange("B2:B10").getValues().map(function (row) {
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
		deviceName: String(values[8] || "").trim()
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
