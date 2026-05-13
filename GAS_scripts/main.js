function runEvery5Minutes() {
	var now = new Date();

	try {
		var settings = getSettings();
		var sensorData = getSensorData(settings.remoToken, settings.deviceName);
		var di = calcDiscomfortIndex(sensorData.temp, sensorData.humidity);
		var currentAcState = getCurrentAcState();
		var controlPlan = evaluateAndControl(settings, sensorData, currentAcState);

		var nextAcState = controlPlan.acStateAfter;
		appendSensorLog(now, sensorData.temp, sensorData.humidity, sensorData.illuminance, di, nextAcState);

		// 高温アラート判定
		try {
			if (settings.discordUrl && settings.highTempAlertThreshold != null && sensorData.temp > settings.highTempAlertThreshold) {
				sendHighTempAlertNotification(settings.discordUrl, sensorData.temp, sensorData.humidity, di);
			}
		} catch (alertError) {
			Logger.log("High temp alert notification failed: " + alertError);
			appendErrorLog(now, "高温アラート通知", String(alertError));
		}

		if (controlPlan.action) {
			var result = controlAircon(settings.remoToken, settings.deviceName, controlPlan.mode, settings.tempMax);
			var opResult = result.success ? "成功" : "失敗";
			var errorDetail = result.success ? "" : result.error;

			appendOperationLog(
				now,
				controlPlan.operation,
				sensorData.temp,
				sensorData.humidity,
				di,
				opResult,
				errorDetail
			);

			// エアコン制御失敗時はエラーログに記録
			if (!result.success) {
				appendErrorLog(now, "Nature Remo (エアコン制御)", errorDetail);
			}

			if (settings.discordUrl) {
				try {
					sendAirconNotification(settings.discordUrl, controlPlan.operation, sensorData.temp, sensorData.humidity, di);
				} catch (notificationError) {
					Logger.log("Aircon notification failed: " + notificationError);
					appendErrorLog(now, "Discord (エアコン通知)", String(notificationError));
				}
			}
		}

		if (settings.discordUrl && shouldSendScheduledReport_(settings, now)) {
			try {
				sendScheduledReport(settings.discordUrl, sensorData.temp, sensorData.humidity, di, nextAcState);
				setLastNotifiedTime(now);
			} catch (reportError) {
				Logger.log("Scheduled report failed: " + reportError);
				appendErrorLog(now, "Discord (定時レポート)", String(reportError));
			}
		}
	} catch (e) {
		Logger.log("runEvery5Minutes error: " + e);
		appendErrorLog(now, "runEvery5Minutes", String(e));

		try {
			var fallback = getSettings();
			if (fallback.discordUrl) {
				sendErrorNotification(fallback.discordUrl, "runEvery5Minutes", String(e));
			}
		} catch (ignored) {
			Logger.log("error notify failed: " + ignored);
			appendErrorLog(new Date(), "Discord (エラー通知)", String(ignored));
		}
	}
}

function shouldSendScheduledReport_(settings, now) {
	var hour = now.getHours();
	if (hour < settings.notifyStart || hour >= settings.notifyEnd) {
		return false;
	}

	var last = getLastNotifiedTime();
	if (!last) {
		return true;
	}

	var diffMinutes = Math.floor((now.getTime() - last.getTime()) / 60000);
	return diffMinutes >= settings.notifyInterval;
}
