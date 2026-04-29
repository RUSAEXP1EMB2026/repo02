# n8n統合実装仕様書

- 文書名: n8n_integration
- 位置づけ: n8nをオーケストレーターとして組み込むための実装仕様（設計書・要求仕様書_コア機能実装.mdの補助）
- 正本/補助: 正本
- 最終更新: 2026-04-29

---

## 思考プロセス（設計判断の根拠）

本仕様書を作成するにあたり、GAS単独構成との比較で、n8n導入が解決する課題を以下に整理した。

| 課題 | GAS単独の限界 | n8nで解決できること |
|---|---|---|
| リトライ制御 | 手動でループ・sleep実装が必要 | HTTPノードの「Retry設定」で宣言的に設定可能 |
| HITL（Discordボタン待機） | doPost()のコールバック管理が複雑 | 「Wait for Webhook」ノードでワークフローを一時停止し、ボタン押下を待機できる |
| エラーの可視化 | Logger.logのみ、実行履歴なし | 実行履歴UIで各ノードの入出力を遡れる。Error Triggerで異常を一元補足 |
| GASトリガーの精度 | ±数分のズレが仕様上保証されない | n8nのScheduleノード（cron式）で精度高く定時実行できる |
| Phase 2 GPS受信エンドポイント | doPost()をGAS側に実装しGASのWebhook URLを外部公開する必要がある | n8nのWebhookノードがエンドポイントを提供し、GASを外部公開しなくて済む |
| 条件分岐の保守性 | if/elseがコード内に埋没 | Switchノード・IFノードでフローが視覚化され、メンバー全員がロジックを把握できる |

**結論：** Phase 1（在宅空調制御）はGASで実装済みの資産を活かしつつ、n8nをオーケストレーターとして外側に被せる。Phase 2（GPS連携・HITL）はn8nで新規実装する。

---

## 1. 導入の目的とメリット

### 1.1 目的

既存のGAS実装（`main.js` / `remo.js` / `discord.js` 等）を破棄せず、n8nをその上位の「ワークフロー制御層」として追加する。これにより以下を達成する。

1. **運用の堅牢性向上** — APIエラー時のリトライ・アラート通知をコード変更なしで管理できる
2. **HITL（Human-in-the-Loop）の実現** — 外出時の消し忘れ通知でDiscordボタン押下を待機し、確認後に機器をオフにするインタラクティブフローを構築できる
3. **Phase 2への拡張容易性** — GPSエンドポイント受信・ジオフェンス判定をn8nワークフローとして独立させ、GASのコード変更を最小限に抑える
4. **チーム全員への可視性** — ノード構成図が設計書と対応し、コードを読まなくてもフローを把握できる

### 1.2 導入しないこと（スコープ外）

- GASのPhase 1実装（`main.js` 〜 `discord.js`）の書き換え
- スプレッドシートのシート構成変更
- n8nによるスプレッドシートの直接操作（読み書きはGAS経由に統一する）

---

## 2. システム構成図案

### 2.1 コンポーネント役割分担

| コンポーネント | 役割 | 担当する処理 |
|---|---|---|
| **n8n** | オーケストレーター | ワークフローのトリガー、条件分岐、リトライ、HITL待機、ノード間のデータ受け渡し |
| **GAS（既存）** | ビジネスロジック実行エンジン | センサ取得、空調制御判定、スプレッドシート読み書き、不快指数算出 |
| **Google スプレッドシート** | データストア（DB） | 設定値・センサログ・操作ログの永続化 |
| **Nature Remo 3 API** | IoTデバイス制御 | センサ値取得、エアコン操作命令の送受信 |
| **Discord Webhook API** | 通知・操作UI | 消し忘れ通知・クーラー操作通知・定時報告・HITLボタンの提供 |
| **IFTTT / iOS Shortcuts** | GPS送信クライアント | スマートフォンのGPS座標をn8nのWebhookエンドポイントへ2分ごとにPOST |

### 2.2 データフロー概略

```
[スマートフォン（IFTTT/Shortcuts）]
  │ GPS座標 POST（2分ごと）
  ▼
[n8n: Webhook Trigger]
  │ ジオフェンス判定（n8n Codeノード or GAS Webhook呼び出し）
  │
  ├─ 外出確定 ─→ [Nature Remo API] 機器状態取得
  │               → [Discord] HITL通知（ボタン付き）
  │               → ユーザー操作待機（Wait for Webhook）
  │               → [Nature Remo API] オフ命令
  │               → [GAS Webhook] 操作ログ記録
  │
  └─ 在宅確定 ─→ [n8n: Schedule Trigger（5分おき）]
                  → [GAS Webhook] runEvery5Minutes を呼び出す
                  → GASが全処理を実行（既存コード）
                  → 結果をn8nが受け取り、エラー時はError Triggerへ
```

---

## 3. n8nワークフロー詳細

### 3.1 外出・帰宅判定および通知フロー

#### トリガー設定

| 項目 | 設定値 |
|---|---|
| ノード種別 | Webhook（POST） |
| エンドポイントパス | `/gps-update` |
| 認証 | Header Auth（`X-GPS-Token: {事前共有トークン}`）|
| 想定リクエストBody | `{ "lat": 34.9756, "lon": 135.9588, "timestamp": "2026-04-29T10:00:00Z" }` |

IFTTTの場合は「Make a web request」アクションでn8nのWebhook URLを指定する。iOS Shortcutsの場合はHTTPリクエストアクションで同URLにPOSTする。

#### 主要ノード構成

```
[1] Webhook Trigger（/gps-update）
  ↓
[2] Codeノード: ジオフェンス判定
  ↓
[3] IFノード: 外出/在宅/変化なし の3分岐
  │
  ├─ 外出確定（2回連続ジオフェンス逸脱）
  │   ↓
  │  [4] HTTP Requestノード: Nature Remo GET /1/devices
  │   ↓
  │  [5] Codeノード: オン状態の機器を抽出
  │   ↓
  │  [6] IFノード: オン機器が1台以上か？
  │   ├─ Yes
  │   │   ↓
  │   │  [7] HTTP Requestノード: Discord Webhook POST（ボタン付きメッセージ）
  │   │   ↓
  │   │  [8] Wait for Webhookノード（HITLポイント）
  │   │   ↓
  │   │  [9] HTTP Requestノード: Nature Remo POST（電源オフ命令）
  │   │   ↓
  │   │  [10] HTTP Requestノード: GAS Webhook（操作ログ記録）
  │   │   ↓
  │   │  [11] HTTP Requestノード: Discord Webhook POST（オフ完了通知）
  │   └─ No → 終了（通知なし）
  │
  ├─ 帰宅確定（2回連続ジオフェンス復帰）
  │   ↓
  │  [4'] HTTP Requestノード: GAS Webhook（在宅ステータスリセット）
  │   ↓
  │  [5'] HTTP Requestノード: Discord Webhook POST（帰宅通知）
  │
  └─ 変化なし → 終了（処理なし）
```

#### ノード[2] Codeノード: ジオフェンス判定の実装仕様

```javascript
// n8n Codeノード（JavaScript）
// 入力: items[0].json = { lat, lon, timestamp }
// スプレッドシートから前回GPS記録を別ノードで取得済み前提

const HOME_LAT  = $node["Sheet: 設定値"].json.homeLat;   // B2
const HOME_LON  = $node["Sheet: 設定値"].json.homeLon;   // B3
const RADIUS_KM = $node["Sheet: 設定値"].json.geofenceKm; // B4
const PREV_STATUS = $node["Sheet: GPS前回"].json.consecutiveCount; // 連続カウント

const lat1 = HOME_LAT * Math.PI / 180;
const lat2 = items[0].json.lat * Math.PI / 180;
const dLat = (items[0].json.lat - HOME_LAT) * Math.PI / 180;
const dLon = (items[0].json.lon - HOME_LON) * Math.PI / 180;

const a = Math.sin(dLat/2)**2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2)**2;
const distance = 2 * 6371 * Math.asin(Math.sqrt(a)); // km

const isOutside = distance > RADIUS_KM;

return [{ json: {
  distance,
  isOutside,
  lat: items[0].json.lat,
  lon: items[0].json.lon,
  timestamp: items[0].json.timestamp
}}];
```

**Note:** 連続2回判定のカウント管理はスプレッドシートの専用セル（例：Settings シートの B12「外出連続カウント」）に書き込み・読み出しする。GASのステートレス問題と同様に、n8nもワークフロー実行間でメモリを持たないため、スプレッドシートをステート管理DBとして利用する。

#### HITL（Human-in-the-Loop）の実装手順

**概要：** ユーザーがDiscordで「オフにする」ボタンを押した時点でn8nワークフローが再開し、Nature Remo APIへオフ命令を送信する。

**手順：**

1. **ノード[7] Discordへのボタン付きメッセージ送信**

Discord Webhook APIの `components` フィールドを使用してボタンを含むメッセージを送信する。

```json
{
  "content": "⚠️ 外出を検知しました。以下の機器がオンのままです。\n- エアコン（設定温度：23℃）\n- テレビ\n\nダッシュボード: https://docs.google.com/spreadsheets/d/【ID】",
  "components": [{
    "type": 1,
    "components": [{
      "type": 2,
      "style": 3,
      "label": "すべてオフにする",
      "custom_id": "turn_off_all"
    }, {
      "type": 2,
      "style": 2,
      "label": "このまま放置する",
      "custom_id": "ignore"
    }]
  }]
}
```

**Note:** Discordのボタンインタラクションを受け取るにはDiscord Botトークン（Application Commands）が必要。Webhook URLだけでは双方向通信ができないため、n8nのWebhookエンドポイントをDiscord Bot Interaction URLとして登録する。

2. **ノード[8] Wait for Webhookノード設定**

| 項目 | 設定値 |
|---|---|
| ノード種別 | Wait |
| Resume: Webhook | オン |
| Webhook URL | n8nが自動生成（ユニーク） |
| タイムアウト | 30分（タイムアウト後は「無視」扱いで終了） |
| 認証 | なし（Discord側からのPOSTを受け取る） |

3. **ボタン押下 → 再開フロー**

ユーザーが「すべてオフにする」を押すと、Discord BotがインタラクションをノードWait URLへ転送し、ワークフローが再開してノード[9]（Nature Remo POST）へ進む。`custom_id: "ignore"` の場合はワークフローをその場で終了する。

---

### 3.2 在宅時自動調温フロー

#### スケジュール設定

| 項目 | 設定値 |
|---|---|
| ノード種別 | Schedule Trigger |
| Interval | Every 5 minutes |
| Cron式（参考） | `*/5 * * * *` |

**Note:** このScheduleトリガーはn8nが担うことで、GASのトリガー精度問題（±数分）を解消する。ただしPhase 1の移行段階では、GASの `runEvery5Minutes` トリガーはそのまま残し、n8nからGASのWebhookエンドポイントを叩く形を採る（段階的移行）。

#### 主要ノード構成

```
[1] Schedule Trigger（5分ごと）
  ↓
[2] HTTP Requestノード: GAS Webhook（runEvery5Minutes 相当を呼び出す）
  ↓
[3] Codeノード: レスポンスのパース（操作有無・エラー有無を取得）
  ↓
[4] IFノード: GASからエラーが返ったか？
  ├─ Yes → [Error Handlingフロー] へ（セクション4参照）
  └─ No
      ↓
[5] IFノード: 操作が発生したか（aircon.js が何らかの制御を実施したか）？
  ├─ Yes
  │   ↓
  │  [6] HTTP Requestノード: Discord Webhook POST（空調操作通知）
  └─ No → 終了
        ↓
[7] IFノード: 定時通知タイミングか？
  ├─ Yes（現在時刻 >= notifyStart かつ <= notifyEnd かつ 前回通知から notifyInterval 分経過）
  │   ↓
  │  [8] HTTP Requestノード: Discord Webhook POST（定時報告）
  └─ No → 終了
```

#### 深夜時間帯除外ロジック（定時通知のみ）

ノード[7]のIFノード内にJavaScript式で判定する。空調制御自体は24時間動作するが、定時通知は設定時間帯（デフォルト7:00〜23:00）に限定する。

```javascript
// n8n IFノードの条件式（例）
const now = new Date();
const hour = now.getHours();
const notifyStart = $node["GAS: 設定値"].json.notifyStart; // 7
const notifyEnd   = $node["GAS: 設定値"].json.notifyEnd;   // 23

// 通知時間帯内かつ、前回通知からinterval分以上経過していること
const inWindow = hour >= notifyStart && hour < notifyEnd;
const elapsed  = (now - new Date($node["Sheet: 前回通知"].json.lastNotified)) / 60000;
const interval = $node["GAS: 設定値"].json.notifyInterval; // 60

return inWindow && elapsed >= interval;
```

#### 条件分岐（除湿/冷房/停止）の可視化

GASの `aircon.js` が実際の判定と制御を行うため、n8n側では結果をルーティングするのみとする。ただしGASを呼び出さずn8nだけで完結させる場合は、以下のSwitchノードで実現する。

```
[Switchノード: 空調モード判定]
  ├─ Case 1: temp > tempMax AND acState == "停止"
  │   → mode = "冷房" → Nature Remo POST (mode: "cool")
  ├─ Case 2: humidity >= humThreshold AND temp <= tempMax AND acState != "除湿"
  │   → mode = "除湿" → Nature Remo POST (mode: "dry")
  ├─ Case 3: temp < tempMin AND (acState == "冷房" OR acState == "除湿")
  │   → mode = "停止" → Nature Remo POST (button: "power-off")
  └─ Default: 操作なし → 終了
```

#### Nature Remo APIのPOSTリクエスト設定（n8n HTTP Requestノード）

要求仕様書_コア機能実装.md の注意事項を n8n HTTP Requestノードで再現する。

| 設定項目 | 設定値 |
|---|---|
| Method | POST |
| URL | `https://api.nature.global/1/appliances/{applianceId}/aircon_settings` |
| Authentication | Header Auth: `Authorization: Bearer {APIトークン}` |
| Body Content Type | **Form-Data（multipart/form-data）** ← `application/json` を指定しない |
| Body Parameters | `temperature: "23"`, `button: ""` |

**重要:** n8nのHTTP RequestノードでBody Content Typeを「Form-Data」または「x-www-form-urlencoded」に設定することで、`Content-Type: application/json` の付与と `JSON.stringify()` の両方を回避できる。これは `remo.js` の注意事項と同等の制約をn8n設定で実現するものである。

---

## 4. エラー管理と非機能要求の実現

### 4.1 リトライ戦略

要求仕様: 「Nature Remo API または Discord Webhook の呼び出しが失敗した場合、1回リトライを実行し、それでも失敗した場合はDiscordへエラー通知を送信する」

#### n8n HTTP Requestノードのリトライ設定

すべてのHTTP RequestノードのOptionsで以下を設定する。

| 設定項目 | 設定値 |
|---|---|
| Retry on Fail | オン |
| Max Tries | 2（初回 + 1回リトライ） |
| Wait Between Tries | 5000ms（5秒） |
| Continue on Fail | **オン**（2回失敗後にエラーデータを次ノードへ渡す） |

「Continue on Fail」をオンにすることで、2回失敗後もワークフローが停止せず、後続のエラーハンドリングノードへ処理が移る。

### 4.2 Error Triggerノードによる異常捕捉

n8nには「Error Trigger」専用ワークフローを用意する。これは他のワークフローでキャッチされなかったエラーを一元的に受け取る。

#### エラー通知ワークフロー構成

```
[1] Error Trigger（ワークフロー全体のエラーを補足）
  ↓
[2] Codeノード: エラー情報を整形
  ↓
[3] HTTP Requestノード: Discord Webhook POST（エラー通知）
  ↓
[4] HTTP Requestノード: GAS Webhook（エラーログをスプレッドシートに記録）
```

#### エラー通知メッセージ仕様

```
【エラー】{ワークフロー名} 実行失敗
発生時刻: {timestamp}
対象API: {失敗したノード名}
エラー内容: {error.message}
HTTP Status: {error.statusCode}
```

#### GASエラーログ記録（OperationLogシートのG列）

ノード[4]でGASのWebhookエンドポイントに以下をPOSTし、GASが `appendOperationLog()` を呼び出してスプレッドシートに記録する。

```json
{
  "action": "error_log",
  "timestamp": "2026-04-29T10:05:00Z",
  "targetApi": "Nature Remo API",
  "errorDetail": "HTTPステータス 503",
  "result": "失敗"
}
```

---

## 5. 既存GASコードの改修・連携方針

### 5.1 GAS側に追加するWebhookエンドポイント

n8nからGASを呼び出す口として、`main.js` に `doPost(e)` 関数を追加する。これによりn8nはHTTP POSTでGASの各処理を起動できる。

**追加コード（main.js への追記）**

```javascript
/**
 * n8nからのHTTP POSTを受け取るエントリーポイント
 * Content-Type: application/json でbodyを送る
 */
function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;
  var result = {};

  if (action === "run_every_5min") {
    // Phase 1の既存メイン処理を呼び出す
    result = runEvery5Minutes();

  } else if (action === "log_operation") {
    // n8nからの操作ログ記録
    appendOperationLog(
      body.timestamp,
      body.operation,
      body.temp,
      body.humidity,
      body.di,
      body.result,
      body.errorDetail || ""
    );
    result = { success: true };

  } else if (action === "error_log") {
    // n8nからのエラーログ記録
    appendOperationLog(
      body.timestamp,
      "APIエラー",
      null, null, null,
      "失敗",
      body.targetApi + ": " + body.errorDetail
    );
    result = { success: true };

  } else if (action === "reset_home_status") {
    // 帰宅時の外出ステータスリセット（Phase 2）
    resetOutingStatus();
    result = { success: true };

  } else {
    result = { success: false, error: "Unknown action: " + action };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

**GASのデプロイ設定:**

| 項目 | 設定値 |
|---|---|
| 実行する関数 | doPost |
| アクセスできるユーザー | 全員（匿名） |
| HTTPSの必須 | はい |

デプロイ後に発行されるURLが n8n HTTP RequestノードのエンドポイントURLとなる。URLは Secrets（スプレッドシート B9列相当）で管理し、コードにハードコードしない。

### 5.2 runEvery5Minutes の改修方針

既存の `runEvery5Minutes()` は処理結果（操作内容・エラー有無）を戻り値として返すように改修し、n8nがレスポンスを元にDiscord通知・エラーハンドリングを分岐できるようにする。

**改修後の戻り値仕様（JSON）:**

```json
{
  "success": true,
  "operation": "冷房開始",
  "temp": 26.5,
  "humidity": 72,
  "di": 77.3,
  "acState": "冷房",
  "errorDetail": null
}
```

操作なしの場合は `"operation": null` を返す。

### 5.3 データの整合性確保（記録タイミング）

n8n と GAS が並行してスプレッドシートを操作することによる競合を防ぐため、以下の原則を定める。

| データ種別 | 書き込み担当 | タイミング |
|---|---|---|
| センサログ（SensorLogシート） | GAS（`appendSensorLog()`） | runEvery5Minutes の実行直後 |
| 操作ログ（OperationLogシート） | GAS（`appendOperationLog()`） | n8nからPOST受信後、GASが記録 |
| 設定値（Settingsシート） | ユーザー手動入力のみ | n8n・GAS ともに読み取り専用 |
| 外出連続カウント（Settings B12） | GAS（doPost経由） | n8nのジオフェンス判定結果をGASに渡してGASが記録 |
| 最終通知時刻（Settings B13） | GAS（`setLastNotifiedTime()`） | runEvery5Minutes 内で更新 |
| エラーログ（OperationLog G列） | GAS（doPost: error_log）| n8nのError Triggerから呼び出し |

**原則: スプレッドシートへの書き込みは必ずGAS経由で行い、n8nがGoogle Sheetsノードで直接書き込まない。** これにより、GASが持つ書き込みロジック（列マッピング・型変換）を二重管理せずに済む。

---

## 6. 段階的な移行計画

| フェーズ | 内容 | 担当 |
|---|---|---|
| Step 1（現在） | GAS単独でPhase 1（在宅空調制御）を完成させる | 全員 |
| Step 2 | GASに `doPost()` を追加してn8nから呼び出し可能にする | 江川（main.js 担当） |
| Step 3 | n8nの「在宅時自動調温フロー」を構築してGASのScheduleトリガーと並走テストする | 鮫島（リーダー） |
| Step 4 | GASのScheduleトリガーを無効化し、n8nのSchedule Triggerに一本化する | 鮫島 |
| Step 5（Phase 2） | n8nにGPS Webhookフローを追加し、HITL込みの外出検知フローを実装する | 全員 |

---

## 完了条件（Completion Criteria）

- [ ] GASの `doPost()` がデプロイされ、n8nからのHTTP POSTで `runEvery5Minutes` が起動できる
- [ ] n8nのSchedule Trigger（5分おき）が正常に稼働し、GAS `doPost()` を呼び出せる
- [ ] Nature Remo APIへのHTTP RequestノードでContent-Type指定なし・form-data形式のPOSTが成功する
- [ ] HTTP Requestノードで「Retry on Fail: 2回、5秒間隔」が設定されている
- [ ] Error Triggerワークフローが稼働し、失敗時にDiscordへエラー通知が届く
- [ ] エラー内容がスプレッドシートのOperationLogシートG列に記録される
- [ ] （Phase 2）GPS Webhookエンドポイントが稼働し、IFTTTからの座標を受信できる
- [ ] （Phase 2）外出確定時にDiscordのボタン付き通知が届き、ボタン押下でオフ命令が送信される