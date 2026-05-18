**テスト手順書（再査読済）

目的
- 本書は `test/aircon.test.js` に実装されたテスト群をプロジェクト視点で再整理し、確実に実行・検証できるようにするための手順と運用上の注意を示します。

適用範囲
- 単体的なロジック確認（`runAllTests()`）および手動の統合確認（`runIntegrationTest()`）。

要点サマリ
- 現状のテストは Google Apps Script（GAS）向けであり、ローカルの `npm test` でそのまま自動実行はできません。GAS エディタか `clasp` を使って実行します。
- CI 環境で自動化する場合は、コアロジックを Node モジュールへ分離し、`jest` 等でテスト可能にするリファクタリングを推奨します。

前提条件
- Google アカウント（GAS へアクセスできること）
- 統合テスト実行時は外部トークン（Nature Remo 等）が必要。これらはリポジトリに含めず、プロジェクトプロパティあるいはシークレット管理で保持してください。

推奨ファイル構成（参照）
- `test/aircon.test.js` : テスト実装（GAS 用）
- `src/` または `lib/` : ロジックを分離する場合の候補ディレクトリ（未存在時は検討）

手順（Quick Start）

A: Apps Script エディタで手動実行（推奨、最短）
1. https://script.google.com にアクセスし、対象プロジェクトを開くか新規作成する。
2. エディタで `test/aircon.test.js` の内容をコピーして新規ファイル（例: `test.gs`）として追加する。
3. 関数選択から `runAllTests` を選び、実行する。
4. 実行ログはエディタの「ログ」か Apps Script ダッシュボードの「Executions」で確認する。

B: `clasp` を使ったリモート実行（自動化寄り）
1. Node と npm を用意する。
2. clasp をインストール:

```bash
npm install -g @google/clasp
```

3. ログイン:

```bash
clasp login
```

4. プロジェクトをクローンまたは設定し、スクリプトを配置して `clasp push` する。
5. 関数を実行:

```bash
clasp run "runAllTests" --scriptId <SCRIPT_ID>
```

6. 実行結果は Apps Script の実行ログで確認する。

C: ローカルで自動テスト化する（推奨：CI 化を目指す場合）
1. 目的: GAS 固有 API を直接使う代わりに、ビジネスロジックを純粋な JS ファイルへ切り出す。
2. 手順の概略:
	- `evaluateAndControl` や `calcDiscomfortIndex` の純粋関数部分を `src/logic.js` に移す。
	- GAS 特有 API 呼び出し（`Logger`, `PropertiesService`, `UrlFetchApp` 等）は薄いラッパーにまとめ、テスト時はモック化する。
	- `jest` を導入してユニットテストを書く。

例: `package.json` / `jest` の基本コマンド

```bash
npm init -y
npm install --save-dev jest

# package.json の scripts に "test": "jest" を追加
```

運用上の注意・セキュリティ
- トークンや API キーはリポジトリに直書きしない。Apps Script のプロパティや外部シークレット管理を利用する。
- `clasp` を CI で使う場合、認証情報の管理に注意。サービスアカウントや OAuth 資格情報の自動化は別途検討が必要。

期待される出力と判定基準
- 正常: ログに `✓` 表示のテストがすべて出力され、`runAllTests()` が例外を投げない。
- 失敗: `testAssert_` により `✗ テスト失敗: ...` がスローされる（ログに詳細が出る）。

トラブルシュート（よくある問題）
- `ReferenceError` や未定義関数: テストが依存する関数群（`evaluateAndControl` 等）がプロジェクトに存在するか確認。
- 認証エラー: `getSettings()` が返すトークンが有効か、またはプロジェクトのスクリプトプロパティに正しく設定されているか確認。
- `clasp run` が失敗する: `scriptId` の誤り、または OAuth 認証が必要。

CI 自動化の提案
- 最短の CI 化手段: コアロジックを Node テスト可能に分離し、GitHub Actions 等で `npm test` を実行するフローを作る。
- Apps Script 固有の統合テストは手動または限定されたデプロイ環境で実行する運用が現実的。

チェックリスト（実行前確認）
- [ ] `test/aircon.test.js` がプロジェクトにあること
- [ ] 統合テストで使うトークンが安全に保管されていること
- [ ] `clasp` を使う場合は `scriptId` を手元に用意していること

補足
- もし希望であれば、ローカルで `npm test` が動くようにリファクタリング（分割・モック化）を代行します。具体的には `evaluateAndControl` 等を抜き出して `jest` テストを作成します。

---

（注）GAS プロジェクト情報やスプレッドシート ID などの機密情報は、公開リポジトリに置かないでください。必要であれば、別途安全な共有手段で渡してください。

## テストカバレッジマップ（関数別）

以下は主要関数のテスト状況マップです。新メンバーはまずこの表を確認し、未テスト項目を優先的に担当してください。

| ファイル | 関数/機能 | 現状のテスト状況 | 優先度 | 備考 |
|---|---:|---|---:|---|
| `GAS_scripts/aircon.js` | `evaluateAndControl` | 既存テストあり | 高 | 境界値（23℃）など追加ケース要検討 |
| `GAS_scripts/sensordata.js` | `calcDiscomfortIndex` | 既存テストあり | 高 | 精度・丸めの追加検証 |
| `GAS_scripts/remo.js` | `getSensorData` | 部分（エラーケース） | 中 | 正常系レスポンスのモック追加推奨 |
| `GAS_scripts/remo.js` | `controlAircon` | 未テスト | 中 | 成功/失敗モックテストを追加済（例あり） |
| `GAS_scripts/remo.js` | `fetchWithRetry_` | 未テスト | 中 | リトライ・例外処理のモック検証必要 |
| `GAS_scripts/sheet.js` | `getSettings`, `append*`, `getCurrentAcState` | 未テスト | 中 | スプレッドシート依存のモック必須 |
| `GAS_scripts/main.js` | `runEvery5Minutes` | 未テスト（統合） | 高 | 統合テスト推奨、外部依存多し |
| `GAS_scripts/location.js` | `doPost', `calcDistanceMeters` | 未テスト | 中 | 境界ケース検証（半径内・境界・外） |
| `GAS_scripts/discord.js` | 通知関数群 | 未テスト | 中 | Webhook モックで検証 |

## 優先タスク（最短ロードマップ）

1. カバレッジマップの未テスト箇所に対して、`test/aircon.test.js` へモックテストを追加（`remo.js`, `sheet.js`）
2. `calcDistanceMeters` と `shouldSendScheduledReport_` の境界ケースをユニット化
3. 統合テスト（`runEvery5Minutes`）は、ステージング用のスプレッドシートとモックWebhookで実施

## Issue 作成テンプレ（テスト失敗時）

タイトル例: [test-fail] runAllTests() — getSensorData mock failed

本文テンプレ:

- 環境: `Apps Script` / `clasp` / `ローカル` のいずれか
- 実行コマンド: （例）`clasp run "runAllTests" --scriptId <SCRIPT_ID>`
- 実行日時: YYYY-MM-DD HH:MM
- ログ抜粋（コピペ）:

```
<ここにログを貼る>
```

- 期待される挙動: （短文）
- 実際の挙動: （短文）
- 既に試したこと:
	- スプレッドシートの存在確認
	- スクリプトプロパティの設定確認
	- 再実行（はい/いいえ）

優先度付けの目安: `blocker`（本番停止） / `high` / `medium` / `low`

## 新メンバー向け：最初の5分/30分チェックリスト（具体）

- 最初の5分:
	1. `clasp login` が通るか確認
	2. `scriptId` と `SPREADSHEET_ID` を入手・確認
	3. Apps Script エディタで `runAllTests()` を一度実行し、ログをコピーする

- 最初の30分:
	1. `testGetSensorDataMock()` を実行してモック確認
	2. `testControlAirconMock()` を実行してモック確認
	3. 未テスト関数一覧（Coverage map）から一つ選び、ユニットケースを追加して実行

## 簡易 CI（GitHub Actions）案（暫定）

リポジトリにワークフローファイルを追加し、手動実行で `clasp` を使ってリモートで `runAllTests()` を実行するジョブを用意しました。環境変数/Secrets の設定が必須です。

- 必要な Secrets:
	- `CLASP_SERVICE_ACCOUNT_JSON` : clasp ログイン用サービスアカウント JSON（内容をそのまま保存）
	- `SCRIPT_ID` : Apps Script の Script ID

ワークフロー名: `.github/workflows/clasp-run-tests.yml`

注意: 現状は暫定ジョブです。より安全で確実な CI を構築するには、コアロジックの Node 化と `jest` 化を推奨します。

## 必須プロパティ一覧（キーと用途）

下記キーは実行や各機能で参照されます。新メンバーは実行前に **Apps Script のスクリプトプロパティ**（もしくは `PropertiesService` 経由で）に設定されていることを確認してください。

- `SPREADSHEET_ID`: データ保存先スプレッドシートの ID（必須）
- `HOME_LAT`, `HOME_LON`: 在宅判定用の自宅座標（緯度・経度）
- `HOME_RADIUS`: 在宅判定の半径（メートル、既定150）
- `LAST_NOTIFIED_TIME`: 最終通知時刻（ISO 文字列、システムが管理）

例（Apps Script エディタのスクリプトプロパティに設定）:

- `SPREADSHEET_ID=1uiVe2AXdvyj2bGs1hGvFW809h4OHB3D8AVnsx5TAWAk`
- `HOME_LAT=35.6895`
- `HOME_LON=139.6917`

## スプレッドシート雛形（ダウンロード）

新規でテスト環境を作る場合は、`docs/spreadsheet_template.csv` をスプレッドシートにインポートしてシート名とヘッダを揃えてください。主要シートとヘッダは以下のとおりです。

- `Settings` シート (B2:B11 に設定値を置く想定)
- `SensorLog` シート: `Timestamp,Temp,Humidity,Illuminance,DI,ACState`
- `OperationLog` シート: `Timestamp,Operation,Temp,Humidity,DI,Result,ErrorDetail`
- `ErrorLog` シート: `Timestamp,API,ErrorDetail`
- `LocationLog` シート: `Timestamp,Lat,Lon,Distance,Status`

ファイル: [repo04/repo02/docs/spreadsheet_template.csv](repo04/repo02/docs/spreadsheet_template.csv)

## 簡易セットアップ手順（コマンド例）

1. `clasp` インストール（Node が必要）:

```bash
npm install -g @google/clasp
```

2. Google にログイン:

```bash
clasp login
```

3. リポジトリの GAS ファイルをプロジェクトへ push して実行:

```bash
clasp push
clasp run "runAllTests" --scriptId <SCRIPT_ID>
```

期待されるログ例（成功）:

```
=== 空調自動制御システム テストスイート開始 ===
✓ 高温（25℃）: 冷房開始
✓ 中温・高湿（22.5℃, 75%）: 除湿開始
✓ 23℃以上（23℃, 80%）: 除湿せず
...（略）
=== すべてのテストが完了しました ===
```

失敗例は `✗ テスト失敗: <message>` の形式で例外が投げられます。ログをコピーして Copilot に渡すと解析が速くなります。

## Copilot Chat を使ったテスト運用（最適化済み）

目的: 新メンバーが Copilot（チャット）経由でテストを実行・拡張できるよう、必要な情報・入力と標準プロンプトを整備します。

1) 前提（メンバーが Copilot に渡す情報）
- `scriptId`（clasp 実行やリモート実行に必要）
- `SPREADSHEET_ID`（Spreadsheet 操作が必要なテスト時）
- どのテストを実行するか（`runAllTests` / `runIntegrationTest` / 個別関数名）
- 統合テストを実行してよいか（外部 API 呼び出しの可否）

注: トークンやシークレットはチャットに直接貼らないでください。代わりに「実行者がローカルでスクリプトプロパティに設定済み」と明記してください。

2) 標準ワークフロー（Copilot への指示テンプレ）
- 初回セットアップ依頼（例）:

```
リポジトリの `repo04/repo02` を参照して、`test/aircon.test.js` の `runAllTests()` を Apps Script 上で実行する手順を示して。私は `scriptId` と `SPREADSHEET_ID` を用意済みで、外部APIトークンは共有しません。まず実行手順を出して。
```

- 実行依頼（clasp 経由）:

```
clasp run "runAllTests" --scriptId <SCRIPT_ID>
```

- モック作成依頼（例: `getSensorData` の正常レスポンスでテストしたい場合）:

```
`test/aircon.test.js` に、`getSensorData` をモックして devices レスポンスのサンプルを返すテストケースを追加してください。実際のトークンは不要で、モック内に固定値を使ってください。
```

3) Copilot に与える最小情報セット（チェックリスト）
- 実行対象の関数名
- `scriptId` と `SPREADSHEET_ID` の有無（→ Copilot はトークン不要の手順を示す）
- モック化の可否（外部呼び出しを本番で行うかどうか）

4) よく使う Copilot プロンプト例（短く）
- テスト実行: "`runAllTests()` を実行し、ログ出力例を教えてください（私は `scriptId` を持っています）"
- モック作成: "`getSensorData` をモックするテストケースを追加してください。devices の JSON サンプルは以下です: ..."
- エラー解析: "以下のログ/エラーメッセージを解析して、原因と修正案を3点提示してください: <ログ貼付>"

5) Copilot で依頼できる具体的作業（範囲の明確化）
- ファイル編集（`apply_patch` 形式での差分作成依頼）
- テストケース追加（モックあり・なし）
- `clasp` 実行コマンドの提示と手順化
- 必要なスクリプトプロパティのリスト作成

6) モック化の簡単な指針（テスト実装者向け）
- UrlFetchApp や SpreadsheetApp をモックする際は、該当関数呼び出しをラップするアダプタ関数を作り、テスト時に差し替えるのが簡単です。
- 例: `getSensorData` の内部で `fetchWithRetry_` を呼んでいる部分を `fetchAdapter.fetchDevices(token)` のように置き換え、テストでは `fetchAdapter.fetchDevices = () => ({temp:25, humidity:50, illuminance:100})` と上書きしてください。

7) エラー報告テンプレ（Copilot に貼ると解析が早くなる）
- 実行したコマンド（`clasp run ...` など）
- コピペ可能なログ出力（stack trace 含む）
- 期待した挙動と実際の挙動の短い説明

8) セキュリティ注意
- シークレットはチャットへ貼らない。必要なら「実行者のローカルで設定済み」と明記するだけで許可してください。

9) 最初の 5 分でできる確認（新メンバー用）
- `clasp login` が通るか確認する。
- `scriptId` と `SPREADSHEET_ID` を用意し、`clasp run "runAllTests" --scriptId <SCRIPT_ID>` の実行手順をCopilotに尋ねる。
- `runAllTests()` を Apps Script エディタで実行してみて、ログをコピーして Copilot に解析を依頼する。

---

上記を追加しました。次は（A）この方針に沿った `test/aircon.test.js` のモック付きサンプル追加、または（B）`docs/test.md` にスクリーンショットやコマンド出力サンプルを追加、どちらを優先しますか？

## テスト対象一覧（プロジェクト全体）

以下は本プロジェクトでテストすべき主要箇所の一覧です。優先度は右側に示します（高: コアロジック / 中: 連携小規模 / 低: 運用・ログ）。

- `GAS_scripts/aircon.js` — `evaluateAndControl`（高）: 温度・湿度に基づく制御判定。論理の正当性と境界値を網羅する必要があります。
- `GAS_scripts/sensordata.js` — `calcDiscomfortIndex`（高）: 不快指数計算。数式の精度と丸めを確認。
- `GAS_scripts/remo.js` — `getSensorData`, `controlAircon`, `resolveApplianceId_`, `fetchWithRetry_`（中）: Nature Remo API との通信部分。ネットワーク失敗時や異常レスポンスの扱いを検証。外部 API としてモック化が必要。
- `GAS_scripts/sheet.js` — `getSettings`, `appendSensorLog`, `appendOperationLog`, `getCurrentAcState`, `appendErrorLog`, `getRecentErrors`（中）: スプレッドシートと PropertiesService 連携。スプレッドシートが存在しない場合や空の時の挙動を検証。
- `GAS_scripts/main.js` — `runEvery5Minutes`, `shouldSendScheduledReport_`（中〜高）: 全体フロー、例外処理、通知分岐を含むため統合テスト対象。
- `GAS_scripts/location.js` — `doPost`, `calcDistanceMeters`, `isUserOutdoor`（中）: ジオフェンシング判定。入力パースと境界条件をテスト。
- `GAS_scripts/discord.js` — `sendDiscordMessage_`, 各通知関数（中）: Webhook 送信処理。成功・失敗・再試行ロジックをテスト（モック化推奨）。
- `GAS_scripts/コード.js` — 未使用/補助（低）: 必要に応じて確認。
- `test/aircon.test.js` — テストランナー（高）: テストカバレッジを拡張し、上記モジュールの未カバー箇所を追加する。

## 現状のテスト状況（2026-05-18）

下記は現状のテストカバレッジと注意点です。GAS 環境依存のため「実行可否」と「カバレッジ」を分けて記載します。

- `evaluateAndControl` — 対応済み（テストあり）: `test/aircon.test.js` に複数ケースが実装されており、主な分岐（冷房開始、除湿開始、停止、操作なし）が検証されています。
- `calcDiscomfortIndex` — 対応済み（テストあり）: `test/aircon.test.js` で快適/不快/危険条件のサンプルが検証されています。
- `getSensorData`（Nature Remo）— 部分対応（エラーケースのテストあり）: `test/aircon.test.js` は無効トークン・無効機器名で例外が投げられるケースを検証していますが、正常系の API 呼び出し（実際のレスポンス処理）は未テスト。外部通信はモック化または統合環境での確認が必要。
- `controlAircon` — 未テスト（ネットワーク依存）: 実際の操作呼び出し成功/失敗の分岐をテストする必要あり。mock で `fetchWithRetry_` のレスポンスを模擬してください。
- `fetchWithRetry_` — 未テスト（ネットワークロジック）: リトライ失敗時の戻り値や例外ハンドリングを検証する必要があります。
- `sheet.js` の各関数 — 未テスト（GAS スプレッドシート依存）: `getSettings` の読み取り、`append*` 系の動作、`getCurrentAcState` の境界（ログ行数が少ない場合）をモック化して検証すべきです。
- `appendErrorLog` / `getRecentErrors` — 部分テストあり（実行時依存）: `aircon.test.js` の `testErrorLog()` はエラーログ記録と取得の簡易確認を行いますが、シートが存在しない場合の初期化ロジックや空シートでの挙動は追加で確認推奨。
- `runEvery5Minutes`（統合フロー）— 未テスト（統合）: 外部依存（Remo、Discord、Spreadsheet）と複数 try/catch を含むため、統合またはエンドツーエンドの環境での検証が望ましい。特にエラーハンドリング分岐と通知ロジック。
- `location.js` の `calcDistanceMeters` — 未テスト: 境界（半径内、ちょうど半径、遠方）の数値検証を推奨。`doPost` のパースとエラー処理も未テスト。
- `discord.js` — 未テスト: `sendDiscordMessage_` のリトライとログ出力の確認が必要。Webhook の無効時の早期リターンはあるが、HTTP エラー時の挙動（ログ、呼び出し元の例外化）を明確化するテスト推奨。

## 推奨アクション（短期）

1. `test/aircon.test.js` に以下を追加:
	- `getSensorData` の正常系モックテスト（devices レスポンスから正しく temp/humidity/illuminance を抽出するか）
	- `controlAircon` の成功/失敗モックテスト
	- `fetchWithRetry_` の失敗・成功ケース（UrlFetchApp の例外や HTTP ステータスを模擬）

2. `sheet.js` の主要関数をモック化してユニット化:
	- `getSettings` の読み取り（既定値適用含む）
	- `getCurrentAcState` の空シート・単一行・複数行の挙動
	- `appendErrorLog` のシート自動作成ロジック

3. `location.js` と `discord.js` のユニットテストを追加（純粋関数部分の分離とモック利用）。

## 推奨アクション（中長期 / CI 化）

- コアロジック（`evaluateAndControl`, `calcDiscomfortIndex`, `calcDistanceMeters` など）を `src/` に抽出して Node 上で `jest` によりテスト可能にする。
- 外部呼び出し（UrlFetchApp, SpreadsheetApp, PropertiesService）は薄いアダプタにまとめ、アダプタをモックすることでユニットテストを確立する。
- その上で GitHub Actions に `clasp` でのデプロイ／限定的統合テストを組み込む。

---

上記を `docs/test.md` に追記しました。次はこれに基づき、実際のテストケース追加（`test/aircon.test.js` の拡張）を行いましょうか？希望があれば私のほうでサンプルのモックテストを作成します。