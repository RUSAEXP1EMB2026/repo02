# 文書メタデータ

- 文書名: API仕様書
- 位置づけ: プロジェクト全体で使用する外部API・内部Webhookの仕様定義
- 正本/補助: 正本
- 最終更新: 2026-04-27

---

## 対象APIの一覧

| API | 用途 | Phase |
|---|---|---|
| Nature Remo 3 API | センサ値取得・機器制御 | Phase 1 / Phase 2 |
| Discord Webhook API | 各種通知送信 | Phase 1 / Phase 2 |
| GAS doPost Webhook | GPS座標受信（IFTTTから） | Phase 2 |

---

## 共通仕様

### ベースURL

| API | ベースURL |
|---|---|
| Nature Remo 3 API | `https://api.nature.global/1` |
| Discord Webhook API | スプレッドシート B9 セルに設定したURL |

### 認証（Nature Remo 3 API共通）

すべてのNature Remo APIリクエストに以下のヘッダーを付与する

```javascript
var headers = {
  'Authorization': 'Bearer ' + token
  // Content-Type は指定しない（POST時も同様）
};
```

> **⚠️ 注意:** `Content-Type: application/json` を指定するとAPIが正常に応答しない。POSTリクエストでも指定禁止。

### エラー処理（共通ルール）

| 条件 | 動作 |
|---|---|
| HTTPステータスが200以外 | 1回リトライを実行する |
| リトライも失敗 | `{ success: false, error: エラー内容 }` を返す |
| エラー発生時 | エラー発生日時・対象API・エラー内容をスプレッドシートに記録する |
| エラー発生時 | Discordの指定チャンネルへエラー通知を送信する |

---

# Phase 1

## Nature Remo 3 API

---

### GET /devices — センサ値取得

**用途:** 室温・湿度・照度をNature Remo 3から取得する

**エンドポイント:**
```
GET https://api.nature.global/1/devices
```

**リクエスト:**
```javascript
var options = {
  "method": "get",
  "headers": headers
};
var response = UrlFetchApp.fetch("https://api.nature.global/1/devices", options);
```

**レスポンス（成功時 HTTP 200）:**
```json
[
  {
    "id": "device-id-string",
    "name": "エアコン",
    "newest_events": {
      "te": { "val": 26.5, "created_at": "2025-04-22T14:00:00Z" },
      "hu": { "val": 72,   "created_at": "2025-04-22T14:00:00Z" },
      "il": { "val": 340,  "created_at": "2025-04-22T14:00:00Z" }
    }
  }
]
```

**レスポンスフィールド:**

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | 文字列 | デバイスID |
| `name` | 文字列 | Remo上のデバイス名（スプレッドシート B10 と照合して対象デバイスを特定する） |
| `newest_events.te.val` | 数値 | 室温（℃） |
| `newest_events.hu.val` | 数値 | 湿度（%） |
| `newest_events.il.val` | 数値 | 照度（lux） |

**GAS実装例（getSensorData）:**
```javascript
function getSensorData(token, deviceName) {
  var headers = { 'Authorization': 'Bearer ' + token };
  var options = { "method": "get", "headers": headers };
  var response = UrlFetchApp.fetch("https://api.nature.global/1/devices", options);
  var devices = JSON.parse(response.getContentText());

  for (var i = 0; i < devices.length; i++) {
    if (devices[i].name === deviceName) {
      var events = devices[i].newest_events;
      return {
        temp:        events.te.val,
        humidity:    events.hu.val,
        illuminance: events.il.val
      };
    }
  }
  return { success: false, error: "デバイスが見つかりません: " + deviceName };
}
```

**戻り値:**
```javascript
{ temp: 26.5, humidity: 72, illuminance: 340 }
```

---

### GET /appliances — applianceId取得

**用途:** エアコン制御に必要な `applianceId` を取得する。この値は変動しないため、初回取得後スプレッドシートに記録して使い回してよい。

**エンドポイント:**
```
GET https://api.nature.global/1/appliances
```

**リクエスト:**
```javascript
var options = {
  "method": "get",
  "headers": headers
};
var response = UrlFetchApp.fetch("https://api.nature.global/1/appliances", options);
```

**レスポンス（成功時 HTTP 200）:**
```json
[
  {
    "id": "appliance-id-string",
    "device": { "name": "エアコン" },
    "type": "AC",
    "aircon": {
      "range": {
        "modes": {
          "cool": { "temp": ["18","19","20","21","22","23","24","25","26","27","28"] },
          "dry":  { "temp": [] }
        }
      }
    }
  }
]
```

**レスポンスフィールド:**

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | 文字列 | **applianceId**。エアコン制御時のURLに使用する |
| `device.name` | 文字列 | デバイス名。B10セルの値と照合して対象機器を特定する |
| `type` | 文字列 | 機器種別。エアコンは `"AC"` |
| `aircon.range.modes.cool.temp` | 文字列配列 | 冷房モードで設定可能な温度の一覧 |

**applianceIdの取得手順:**
1. 上記エンドポイントを1回実行してレスポンスを確認する
2. `type === "AC"` かつ `device.name` がB10セルの値と一致するオブジェクトの `id` を取得する
3. 取得した `id` をスプレッドシートの所定のセルに記録する（変動しないため再取得不要）

---

### POST /appliances/{applianceId}/aircon_settings — エアコン制御

**用途:** エアコンの冷房・除湿・停止を制御する

**エンドポイント:**
```
POST https://api.nature.global/1/appliances/{applianceId}/aircon_settings
```

**⚠️ リクエストの注意事項（必読）:**
- `Content-Type` を指定してはいけない
- `payload` を `JSON.stringify()` してはいけない
- `temperature` は数値ではなく文字列で渡す

**リクエスト（冷房開始の例）:**
```javascript
var headers = {
  'Authorization': 'Bearer ' + token
  // Content-Type は指定しない
};
var payload = {
  "button": "",         // 空文字でデフォルト動作
  "temperature": "23"   // 文字列で渡す
};
var options = {
  "method": "post",
  "headers": headers,
  "payload": payload    // JSON.stringify() しない
};
var url = "https://api.nature.global/1/appliances/" + applianceId + "/aircon_settings";
UrlFetchApp.fetch(url, options);
```

**payloadパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `button` | 文字列 | 必須 | 操作ボタン名。通常は空文字 `""` を指定する |
| `temperature` | 文字列 | 任意 | 設定温度。停止時は不要 |
| `operation_mode` | 文字列 | 任意 | `"cool"`（冷房）/ `"dry"`（除湿）/ `"warm"`（暖房） |
| `button` に `"power-off"` | 文字列 | - | 停止時は `button` に `"power-off"` を指定する |

**モード別のpayload設定:**

| 操作 | button | operation_mode | temperature |
|---|---|---|---|
| 冷房開始 | `""` | `"cool"` | `"23"`（設定温度） |
| 除湿開始 | `""` | `"dry"` | 不要 |
| 停止 | `"power-off"` | 不要 | 不要 |

**レスポンス（成功時 HTTP 200）:**
```json
{}
```

**GAS実装例（controlAircon）:**
```javascript
function controlAircon(token, applianceId, mode, temp) {
  var headers = { 'Authorization': 'Bearer ' + token };
  var payload = {};

  if (mode === "cool") {
    payload = { "button": "", "operation_mode": "cool", "temperature": String(temp) };
  } else if (mode === "dry") {
    payload = { "button": "", "operation_mode": "dry" };
  } else if (mode === "off") {
    payload = { "button": "power-off" };
  }

  var options = { "method": "post", "headers": headers, "payload": payload };
  var url = "https://api.nature.global/1/appliances/" + applianceId + "/aircon_settings";

  try {
    var response = UrlFetchApp.fetch(url, options);
    return { success: true };
  } catch (e) {
    // 1回リトライ
    try {
      var retry = UrlFetchApp.fetch(url, options);
      return { success: true };
    } catch (e2) {
      return { success: false, error: e2.message };
    }
  }
}
```

**戻り値:**
```javascript
{ success: true }
// または
{ success: false, error: "エラー内容" }
```

---

## Discord Webhook API — Phase 1

**用途:** 空調操作通知・定時報告・エラー通知をDiscordチャンネルへ送信する

**エンドポイント:**
```
POST {Discord Webhook URL}
```

**リクエスト共通仕様:**
```javascript
var options = {
  "method": "post",
  "contentType": "application/json",
  "payload": JSON.stringify({ "content": "メッセージ本文" })
};
UrlFetchApp.fetch(webhookUrl, options);
```

> **NOTE:** Discord Webhook は `Content-Type: application/json` を指定する（Nature Remo APIとは異なる）

**レスポンス（成功時 HTTP 204）:**
```
（レスポンスボディなし）
```

---

### 通知フォーマット一覧

#### 空調操作通知（sendAirconNotification）

```
【冷房開始】2025/04/22 14:05
室温：26.5℃ / 湿度：72% / 不快指数：77.3
設定温度：23℃
```

```
【除湿開始】2025/04/22 14:05
室温：25.0℃ / 湿度：74% / 不快指数：75.1
```

```
【停止】2025/04/22 14:05
室温：21.8℃ / 湿度：65% / 不快指数：70.2
```

**関数シグネチャ:**
```javascript
sendAirconNotification(webhookUrl, operation, temp, humidity, di)
// operation: "冷房開始" / "除湿開始" / "停止"
```

---

#### 定時報告通知（sendScheduledReport）

```
【定時報告】2025/04/22 14:00
室温：26.5℃ / 湿度：72% / 不快指数：77.3
エアコン：冷房稼働中
```

**関数シグネチャ:**
```javascript
sendScheduledReport(webhookUrl, temp, humidity, di, acState)
// acState: "冷房稼働中" / "除湿稼働中" / "停止中"
```

---

#### エラー通知（sendErrorNotification）

```
【エラー】Nature Remo API 呼び出し失敗
発生時刻：2025/04/22 14:05
詳細：HTTPステータス 503
```

**関数シグネチャ:**
```javascript
sendErrorNotification(webhookUrl, targetApi, errorDetail)
// targetApi: "Nature Remo API" / "Discord Webhook API"
```

---

# Phase 2

## Nature Remo 3 API

---

### GET /appliances — 機器稼働状態取得

**用途:** 外出時に監視対象機器（テレビ・照明・エアコン等）の電源状態を取得する

**エンドポイント:**
```
GET https://api.nature.global/1/appliances
```

**レスポンス（Phase 2で追加参照するフィールド）:**
```json
[
  {
    "id": "appliance-id-string",
    "device": { "name": "テレビ" },
    "type": "IR",
    "signals": [
      { "id": "signal-id-string", "name": "電源", "image": "ico_power" }
    ]
  }
]
```

**Phase 2で追加参照するフィールド:**

| フィールド | 型 | 説明 |
|---|---|---|
| `type` | 文字列 | `"IR"`（赤外線リモコン）/ `"AC"`（エアコン）/ `"TV"` 等 |
| `signals` | 配列 | 送信可能な信号の一覧 |
| `signals[].id` | 文字列 | **signalId**。信号送信時のURLに使用する |
| `signals[].name` | 文字列 | 信号名（例: `"電源"`）。対象信号の特定に使用する |

**⚠️ 未確定事項:**
- 監視対象機器（テレビ・照明等）の種類は未確定
- 確定後、対象機器の `type` および `signals` の構造を本仕様書に追記する

---

### POST /appliances/{applianceId}/signals/{signalId}/send — 信号送信

**用途:** テレビ・照明等の赤外線リモコン操作（電源オフ等）を送信する

**エンドポイント:**
```
POST https://api.nature.global/1/appliances/{applianceId}/signals/{signalId}/send
```

**リクエスト:**
```javascript
var headers = { 'Authorization': 'Bearer ' + token };
var options = {
  "method": "post",
  "headers": headers,
  "payload": {}  // bodyなし
};
var url = "https://api.nature.global/1/appliances/" + applianceId
        + "/signals/" + signalId + "/send";
UrlFetchApp.fetch(url, options);
```

**レスポンス（成功時 HTTP 200）:**
```json
{}
```

**⚠️ 未確定事項:**
- 監視対象機器が確定した後、各機器の `applianceId` と `signalId` を取得して本仕様書に追記する

---

### 電気代算出（推定値方式）

**用途:** クーラーの稼働時間と消費電力から電気代を推定し、日次・週次・月次の上限超過をアラートする

**算出方法:**

```
電気代（円）= 稼働時間（h）× 消費電力（kW）× 電力単価（円/kWh）
```

**パラメータ:**

| パラメータ | 取得元 | 説明 |
|---|---|---|
| 稼働時間 | スプレッドシート（SensorLog） | エアコン状態が「冷房」または「除湿」の行数 × 5分 で算出する |
| 消費電力 | スプレッドシート（Settings） | ユーザーが入力する（kW単位）。デフォルト値は未定 |
| 電力単価 | スプレッドシート（Settings） | ユーザーが入力する（円/kWh単位）。デフォルト: 27円/kWh（全国平均） |

**Settings シートへの追加セル（Phase 2で追加）:**

| セル | 項目名 | デフォルト値 |
|---|---|---|
| B11 | 消費電力（kW） | （入力） |
| B12 | 電力単価（円/kWh） | 27 |
| B13 | 日次上限額（円） | （入力） |
| B14 | 週次上限額（円） | （入力） |
| B15 | 月次上限額（円） | （入力） |

---

## GAS doPost Webhook — GPS座標受信

**用途:** IFTTT または iOS Shortcuts からGPS座標を受信し、在宅/外出の判定を行う

**エンドポイント:**
```
POST https://script.google.com/macros/s/{deploymentId}/exec
```

**リクエスト（IFTTT / iOS Shortcuts から送信される）:**
```json
{
  "lat": 35.6895,
  "lng": 139.6917,
  "timestamp": "2025-04-22T14:00:00Z"
}
```

**リクエストフィールド:**

| フィールド | 型 | 説明 |
|---|---|---|
| `lat` | 数値 | 緯度 |
| `lng` | 数値 | 経度 |
| `timestamp` | 文字列 | 送信日時（ISO 8601形式） |

**GAS実装例（doPost）:**
```javascript
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var lat  = data.lat;
  var lng  = data.lng;
  // ハーバーサイン式で自宅との距離を算出し、在宅/外出を判定する
}
```

**ハーバーサイン式（距離算出）:**
```javascript
function calcDistance(lat1, lng1, lat2, lng2) {
  var R = 6371; // 地球半径（km）
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2)
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
        * Math.sin(dLng/2) * Math.sin(dLng/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // km単位
}
```

**在宅/外出の判定ロジック:**

| 条件 | 判定 | ステータス変更 |
|---|---|---|
| 距離 > ジオフェンス半径 が2回連続 | 外出 | 在宅 → 外出 |
| 距離 ≤ ジオフェンス半径 が2回連続 | 在宅 | 外出 → 在宅 |
| 1回のみ逸脱・復帰 | 誤検知として無視 | 変更なし |

**Settings シートへの追加セル（Phase 2で追加）:**

| セル | 項目名 | デフォルト値 |
|---|---|---|
| B16 | 自宅緯度 | （入力） |
| B17 | 自宅経度 | （入力） |
| B18 | ジオフェンス半径（m） | 200 |
| B19 | GPS取得間隔（分） | 2 |
| B20 | 室内高温アラートしきい値（℃） | 35 |

---

## Discord Webhook API — Phase 2

### 通知フォーマット一覧（追加分）

#### 消し忘れ通知（sendForgetNotification）

```
【消し忘れ通知】2025/04/22 14:05
外出を検知しました。以下の機器がオン状態です。

・テレビ（稼働：2時間15分）
・照明（稼働：3時間40分）

操作ダッシュボード: https://docs.google.com/spreadsheets/d/【spreadsheetId】
```

**関数シグネチャ:**
```javascript
sendForgetNotification(webhookUrl, devices, dashboardUrl)
// devices: [{ name: "テレビ", duration: "2時間15分" }, ...]
```

---

#### 室内高温アラート（sendHeatAlert）

```
【室内高温アラート】2025/04/22 14:05
外出中に室温が上限を超えました。
現在の室温：36.2℃（しきい値：35℃）
湿度：68%
```

**関数シグネチャ:**
```javascript
sendHeatAlert(webhookUrl, temp, humidity, threshold)
```

---

#### 電気代アラート（sendElectricityAlert）

```
【電気代アラート】2025/04/22
日次上限を超過しました。
本日の推定電気代：520円（上限：500円）
今月の累計：3,240円
```

**関数シグネチャ:**
```javascript
sendElectricityAlert(webhookUrl, period, current, limit, monthTotal)
// period: "日次" / "週次" / "月次"
```

---

## 未確定事項一覧

| 項目 | 状態 | 確定後の対応 |
|---|---|---|
| 監視対象機器の種類（テレビ・照明等） | 未確定 | `GET /appliances` で `applianceId` / `signalId` を取得して追記 |
| 各機器の消費電力（kW） | 未確定 | Settings シート B11 に入力する値を決定して追記 |
| クーラーの消費電力（kW） | 未確定 | 同上 |