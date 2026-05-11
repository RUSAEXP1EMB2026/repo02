function sendAirconNotification(webhookUrl, operation, temp, humidity, di) {
	var message = [
		"【" + operation + "】" + formatDate_(new Date()),
		"室温: " + temp + "℃ / 湿度: " + humidity + "% / 不快指数: " + di
	].join("\n");

	sendDiscordMessage_(webhookUrl, message);
}

function sendScheduledReport(webhookUrl, temp, humidity, di, acState) {
	var message = [
		"【定時報告】" + formatDate_(new Date()),
		"室温: " + temp + "℃ / 湿度: " + humidity + "% / 不快指数: " + di,
		"エアコン: " + acState
	].join("\n");

	sendDiscordMessage_(webhookUrl, message);
}

function sendErrorNotification(webhookUrl, targetApi, errorDetail) {
	var message = [
		"【エラー】" + targetApi,
		"発生時刻: " + formatDate_(new Date()),
		"詳細: " + errorDetail
	].join("\n");

	sendDiscordMessage_(webhookUrl, message);
}

function sendDiscordMessage_(webhookUrl, content) {
	if (!webhookUrl) {
		return;
	}

	var payload = JSON.stringify({ content: content });
	var options = {
		method: "post",
		contentType: "application/json",
		payload: payload,
		muteHttpExceptions: true
	};

	// リトライ機能付き
	var attempt = 0;
	var lastError = "";

	while (attempt < 2) {
		try {
			var response = UrlFetchApp.fetch(webhookUrl, options);
			var code = response.getResponseCode();
			if (code >= 200 && code < 300) {
				return; // 成功
			}
			lastError = "HTTP " + code + ": " + response.getContentText();
		} catch (e) {
			lastError = String(e);
		}
		attempt++;
	}

	Logger.log("Discord送信失敗（最大リトライ後）: " + lastError);
}

function sendHighTempAlertNotification(webhookUrl, temp, humidity, di) {
	if (!webhookUrl) {
		return;
	}

	var message = [
		"【高温アラート】" + formatDate_(new Date()),
		"室温: " + temp + "℃ / 湿度: " + humidity + "% / 不快指数: " + di,
		"⚠️ 室温が設定した上限を超えています"
	].join("\n");

	sendDiscordMessage_(webhookUrl, message);
}

function sendOutdoorNotification(webhookUrl, deviceList, spreadsheetUrl) {
	if (!webhookUrl) {
		return;
	}

	var deviceInfo = deviceList.map(function (device) {
		var info = device.name;
		if (device.operatingTime) {
			info += "（稼働中: " + device.operatingTime + "分）";
		}
		if (device.setting) {
			info += " [設定: " + device.setting + "]";
		}
		return info;
	}).join("\n");

	var message = [
		"【消し忘れ通知】" + formatDate_(new Date()),
		"外出時にオン状態の機器：",
		deviceInfo,
		"",
		"操作: " + (spreadsheetUrl ? "[スプレッドシートで操作](" + spreadsheetUrl + ")" : "スプレッドシートで操作してください")
	].join("\n");

	sendDiscordMessage_(webhookUrl, message);
}

function formatDate_(date) {
	return Utilities.formatDate(date, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
}
