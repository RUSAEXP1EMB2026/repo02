function evaluateAndControl(settings, sensorData, currentAcState) {
	var temp = Number(sensorData.temp);
	var humidity = Number(sensorData.humidity);

	if (temp > settings.tempMax && currentAcState === "停止") {
		return {
			action: true,
			operation: "冷房開始",
			mode: "cool",
			acStateAfter: "冷房"
		};
	}

	if (
		humidity >= settings.humidityThreshold &&
		temp <= settings.tempMax &&
		(currentAcState === "停止" || currentAcState === "冷房")
	) {
		return {
			action: true,
			operation: "除湿開始",
			mode: "dry",
			acStateAfter: "除湿"
		};
	}

	if (temp < settings.tempMin && (currentAcState === "冷房" || currentAcState === "除湿")) {
		return {
			action: true,
			operation: "停止",
			mode: "off",
			acStateAfter: "停止"
		};
	}

	return {
		action: false,
		operation: "操作なし",
		mode: null,
		acStateAfter: currentAcState || "停止"
	};
}
