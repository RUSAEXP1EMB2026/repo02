/**
 * 空調自動制御システム テストスイート
 * Phase 1 基本機能テスト
 */

/**
 * すべてのテストを実行
 * Apps Script エディタから直接実行可能
 */
function runAllTests() {
	Logger.log("=== 空調自動制御システム テストスイート開始 ===\n");
	
	testTemperatureControl();
	testDiscomfortIndex();
	testErrorHandling();
	testErrorLog();
	
	Logger.log("\n=== すべてのテストが完了しました ===");
}

/**
 * テスト1: 温度制御ロジック
 */
function testTemperatureControl() {
	Logger.log("\n【テスト1】温度制御ロジック");
	
	var settings = {
		tempMin: 22,
		tempMax: 23,
		humidityThreshold: 70
	};
	
	// テストケース1: 気温高い → 冷房開始
	var result1 = evaluateAndControl(settings, { temp: 25, humidity: 50 }, "停止");
	testAssert_(result1.action === true && result1.mode === "cool", "高温時の冷房開始判定失敗");
	Logger.log("✓ 高温（25℃）: 冷房開始");
	
	// テストケース2: 気温低い・湿度高い → 除湿開始
	var result2 = evaluateAndControl(settings, { temp: 22.5, humidity: 75 }, "停止");
	testAssert_(result2.action === true && result2.mode === "dry", "除湿判定失敗");
	Logger.log("✓ 中温・高湿（22.5℃, 75%）: 除湿開始");
	
	// テストケース3: 室温23℃以上では除湿しない
	var result3 = evaluateAndControl(settings, { temp: 23, humidity: 80 }, "停止");
	testAssert_(result3.action === false, "23℃以上で除湿判定される");
	Logger.log("✓ 23℃以上（23℃, 80%）: 除湿せず");
	
	// テストケース4: 気温低い・冷房稼働中 → 停止
	var result4 = evaluateAndControl(settings, { temp: 20, humidity: 50 }, "冷房");
	testAssert_(result4.action === true && result4.mode === "off", "低温時の停止判定失敗");
	Logger.log("✓ 低温（20℃）・冷房稼働中: 停止");
	
	// テストケース5: 除湿稼働中も停止判定
	var result5 = evaluateAndControl(settings, { temp: 20, humidity: 50 }, "除湿");
	testAssert_(result5.action === true && result5.mode === "off", "除湿中の停止判定失敗");
	Logger.log("✓ 低温（20℃）・除湿稼働中: 停止");
	
	// テストケース6: 目標範囲内 → 操作なし
	var result6 = evaluateAndControl(settings, { temp: 22.5, humidity: 60 }, "停止");
	testAssert_(result6.action === false, "目標範囲内での操作判定失敗");
	Logger.log("✓ 目標範囲内（22.5℃）: 操作なし");
	
	Logger.log("✓ 温度制御ロジックテスト完了");
}

/**
 * テスト2: 不快指数計算
 */
function testDiscomfortIndex() {
	Logger.log("\n【テスト2】不快指数（DI）計算");
	
	// テストケース1: 快適な条件（22℃, 60%）
	var di1 = calcDiscomfortIndex(22, 60);
	testAssert_(di1 < 65, "快適条件のDI値が異常");
	Logger.log("✓ 快適条件（22℃, 60%）: DI = " + di1.toFixed(1));
	
	// テストケース2: 不快な条件（28℃, 80%）
	var di2 = calcDiscomfortIndex(28, 80);
	testAssert_(di2 > 70, "不快条件のDI値が異常");
	Logger.log("✓ 不快条件（28℃, 80%）: DI = " + di2.toFixed(1));
	
	// テストケース3: 危険な条件（35℃, 90%）
	var di3 = calcDiscomfortIndex(35, 90);
	testAssert_(di3 > 80, "危険条件のDI値が異常");
	Logger.log("✓ 危険条件（35℃, 90%）: DI = " + di3.toFixed(1));
	
	Logger.log("✓ 不快指数計算テスト完了");
}

/**
 * テスト3: エラーハンドリング
 */
function testErrorHandling() {
	Logger.log("\n【テスト3】エラーハンドリング");
	
	// テストケース1: 無効なトークン
	try {
		getSensorData("", "エアコン");
		testAssert_(false, "無効なトークンでエラーが発生しなかった");
	} catch (e) {
		Logger.log("✓ 無効なトークン検出: " + String(e));
	}
	
	// テストケース2: 無効な機器名
	try {
		getSensorData("dummy_token", "");
		testAssert_(false, "無効な機器名でエラーが発生しなかった");
	} catch (e) {
		Logger.log("✓ 無効な機器名検出: " + String(e));
	}
	
	Logger.log("✓ エラーハンドリングテスト完了");
}

/**
 * テスト4: エラーログ機能
 */
function testErrorLog() {
	Logger.log("\n【テスト4】エラーログ記録");
	
	var now = new Date();
	var testError = "テストエラー（" + now.getTime() + "）";
	
	try {
		// エラーを記録
		appendErrorLog(now, "テストAPI", testError);
		Logger.log("✓ エラーログを記録しました");
		
		// 最近のエラーを取得
		var recentErrors = getRecentErrors(5);
		if (recentErrors.length > 0) {
			Logger.log("✓ 最近のエラー数: " + recentErrors.length);
			var lastError = recentErrors[recentErrors.length - 1];
			Logger.log("  - 最新エラー: " + lastError.apiName + " / " + lastError.errorDetail);
		}
	} catch (e) {
		Logger.log("⚠ エラーログテスト実行時に例外: " + String(e));
	}
	
	Logger.log("✓ エラーログテスト完了");
}

/**
 * テストアサーション関数
 */
function testAssert_(condition, message) {
	if (!condition) {
		var error = "✗ テスト失敗: " + message;
		Logger.log(error);
		throw new Error(error);
	}
}

/**
 * 統合テスト（手動実行用）
 * 実際のセンサデータでシステムの動作を確認
 */
function runIntegrationTest() {
	Logger.log("\n=== 統合テスト開始 ===");
	
	try {
		var settings = getSettings();
		Logger.log("設定値取得成功:");
		Logger.log("  - 目標温度: " + settings.tempMin + "℃ - " + settings.tempMax + "℃");
		Logger.log("  - 湿度しきい値: " + settings.humidityThreshold + "%");
		Logger.log("  - 高温アラート: " + settings.highTempAlertThreshold + "℃");
		
		if (!settings.remoToken) {
			Logger.log("⚠ Nature Remo トークンが未設定です");
			return;
		}
		
		Logger.log("\n最新のセンサデータを取得中...");
		var sensorData = getSensorData(settings.remoToken, settings.deviceName);
		Logger.log("✓ セッサデータ取得成功:");
		Logger.log("  - 気温: " + sensorData.temp + "℃");
		Logger.log("  - 湿度: " + sensorData.humidity + "%");
		Logger.log("  - 照度: " + sensorData.illuminance + "lux");
		
		var di = calcDiscomfortIndex(sensorData.temp, sensorData.humidity);
		Logger.log("  - 不快指数: " + di);
		
		var currentAcState = getCurrentAcState();
		Logger.log("\n現在のエアコン状態: " + currentAcState);
		
		var controlPlan = evaluateAndControl(settings, sensorData, currentAcState);
		Logger.log("制御判定:");
		Logger.log("  - アクション: " + (controlPlan.action ? "実行" : "なし"));
		if (controlPlan.action) {
			Logger.log("  - 操作内容: " + controlPlan.operation);
			Logger.log("  - モード: " + controlPlan.mode);
		}
		
		Logger.log("\n✓ 統合テスト完了");
	} catch (e) {
		Logger.log("✗ 統合テスト失敗: " + String(e));
	}
}