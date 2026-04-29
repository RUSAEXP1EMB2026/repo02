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
	UrlFetchApp.fetch(webhookUrl, {
		method: "post",
		contentType: "application/json",
		payload: payload,
		muteHttpExceptions: true
	});
}

function formatDate_(date) {
	return Utilities.formatDate(date, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
}
