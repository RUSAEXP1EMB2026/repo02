var REMO_API_BASE = "https://api.nature.global/1";

function getSensorData(token, deviceName) {
	if (!token) {
		throw new Error("Nature Remo API token is empty");
	}
	if (!deviceName) {
		throw new Error("Device name is empty");
	}

	var url = REMO_API_BASE + "/devices";
	var result = fetchWithRetry_(url, {
		method: "get",
		headers: {
			Authorization: "Bearer " + token
		},
		muteHttpExceptions: true
	});

	if (!result.success) {
		throw new Error("Failed to fetch devices: " + result.error);
	}

	var devices = JSON.parse(result.body);
	var target = devices.filter(function (d) {
		return d.name === deviceName;
	})[0];

	if (!target || !target.newest_events) {
		throw new Error("Target device not found: " + deviceName);
	}

	return {
		temp: Number(target.newest_events.te ? target.newest_events.te.val : 0),
		humidity: Number(target.newest_events.hu ? target.newest_events.hu.val : 0),
		illuminance: Number(target.newest_events.il ? target.newest_events.il.val : 0)
	};
}

function controlAircon(token, deviceName, mode, temp) {
	try {
		var applianceId = resolveApplianceId_(token, deviceName);
		var url = REMO_API_BASE + "/appliances/" + applianceId + "/aircon_settings";
		var payload = mode === "off"
			? { button: "power-off" }
			: {
					operation_mode: mode,
					temperature: String(temp),
					temperature_unit: "c"
				};

		var result = fetchWithRetry_(url, {
			method: "post",
			headers: {
				Authorization: "Bearer " + token
			},
			payload: payload,
			muteHttpExceptions: true
		});

		return result.success
			? { success: true }
			: { success: false, error: result.error };
	} catch (e) {
		return { success: false, error: String(e) };
	}
}

function resolveApplianceId_(token, deviceName) {
	var url = REMO_API_BASE + "/appliances";
	var result = fetchWithRetry_(url, {
		method: "get",
		headers: {
			Authorization: "Bearer " + token
		},
		muteHttpExceptions: true
	});

	if (!result.success) {
		throw new Error("Failed to fetch appliances: " + result.error);
	}

	var appliances = JSON.parse(result.body);
	var target = appliances.filter(function (a) {
		return a.nickname === deviceName || a.name === deviceName;
	})[0];

	if (!target) {
		throw new Error("Target appliance not found: " + deviceName);
	}

	return target.id;
}

function fetchWithRetry_(url, options) {
	var attempt = 0;
	var lastError = "";

	while (attempt < 2) {
		try {
			var response = UrlFetchApp.fetch(url, options);
			var code = response.getResponseCode();
			var body = response.getContentText();
			if (code >= 200 && code < 300) {
				return { success: true, body: body };
			}
			lastError = "HTTP " + code + ": " + body;
		} catch (e) {
			lastError = String(e);
		}
		attempt++;
	}

	return { success: false, error: lastError };
}
