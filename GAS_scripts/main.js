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

			if (settings.discordUrl) {
				sendAirconNotification(settings.discordUrl, controlPlan.operation, sensorData.temp, sensorData.humidity, di);
			}
		}

		if (settings.discordUrl && shouldSendScheduledReport_(settings, now)) {
			sendScheduledReport(settings.discordUrl, sensorData.temp, sensorData.humidity, di, nextAcState);
			setLastNotifiedTime(now);
		}
	} catch (e) {
		Logger.log("runEvery5Minutes error: " + e);

		try {
			var fallback = getSettings();
			if (fallback.discordUrl) {
				sendErrorNotification(fallback.discordUrl, "runEvery5Minutes", String(e));
			}
		} catch (ignored) {
			Logger.log("error notify failed: " + ignored);
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
