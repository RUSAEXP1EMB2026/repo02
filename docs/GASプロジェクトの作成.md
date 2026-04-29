# 文書メタデータ

- 文書名: GASプロジェクトの作成
- 位置づけ: Spreadsheet/GASプロジェクト作成と共有の手順書
- 正本/補助: 正本
- 最終更新: 2026-04-27

# setup_gas_project: GASプロジェクトの作成・共有・scriptId配布

## CONTEXT

- 対象: チームリーダー（鮫島）のみが実行する
- 目的: Google Apps Script プロジェクトとスプレッドシートを作成し、チーム全員が開発できる状態にする
- 実行環境: ブラウザ / VS Code ターミナル
- 前提条件:
  - `setup_git_config.md` が完了していること
  - 開発用Googleアカウントでブラウザにサインイン済みであること
  - `clasp login` が完了していること

---

## STEP 1: スプレッドシートを新規作成する

### ACTION
以下のURLを開く

```
https://sheets.google.com
```

「新しいスプレッドシートを作成」の `+` ボタンをクリックする

### VERIFY
新しいスプレッドシートが開き、URL が以下の形式になっていること

```
https://docs.google.com/spreadsheets/d/【spreadsheetId】/edit
```

`【spreadsheetId】` の部分をメモしておく → STEP 8 で使用する

---

## STEP 2: スプレッドシートを日本語で命名する

### ACTION
スプレッドシート左上の「無題のスプレッドシート」をクリックして以下の名前に変更する

```
SmartHome_Controller
```

### VERIFY
タブのタイトルおよびスプレッドシート左上が `SmartHome_Controller` に変わっていれば完了

---

## STEP 3: シートを3つ作成・命名する

### ACTION

#### 3-1. シート1の名前を変更する
画面下部の `シート1` タブを右クリック → 「名前を変更」を選択

```
Settings
```

#### 3-2. シート2を追加・命名する
画面下部の `+` ボタンをクリックして新しいシートを追加し、同様に名前を変更する

```
SensorLog
```

#### 3-3. シート3を追加・命名する
同様の手順でシートを追加する

```
OperationLog
```

### VERIFY
画面下部に以下の3つのタブが存在すること

| 確認 | シート名 |
|---|---|
| [ ] | Settings |
| [ ] | SensorLog |
| [ ] | OperationLog |

---

## STEP 4: Settings シートに設定値の枠を作成する

### ACTION
`Settings` シートを選択し、以下の表の通りにセルに値を入力する

| セル | 入力する値 |
|---|---|
| A2 | 目標温度（下限） |
| A3 | 目標温度（上限） |
| A4 | 除湿しきい値（湿度） |
| A5 | 通知時間帯（開始） |
| A6 | 通知時間帯（終了） |
| A7 | 通知間隔（分） |
| A8 | Nature Remo APIトークン |
| A9 | Discord Webhook URL |
| A10 | エアコンデバイス名 |
| B2 | 22 |
| B3 | 23 |
| B4 | 70 |
| B5 | 7 |
| B6 | 23 |
| B7 | 60 |

#### NOTE
- B8・B9・B10 は各自が後から入力するため空欄のままにする
- B8・B9 は認証情報のため、チームで共有しないよう口頭で注意する

### VERIFY
`Settings` シートのA列とB列に上記の内容が入力されていること

---

## STEP 5: SensorLog シートにヘッダーを作成する

### ACTION
`SensorLog` シートを選択し、1行目に以下を入力する

| セル | 入力する値 |
|---|---|
| A1 | タイムスタンプ |
| B1 | 室温（℃） |
| C1 | 湿度（%） |
| D1 | 照度（lux） |
| E1 | 不快指数 |
| F1 | エアコン状態 |

---

## STEP 6: OperationLog シートにヘッダーを作成する

### ACTION
`OperationLog` シートを選択し、1行目に以下を入力する

| セル | 入力する値 |
|---|---|
| A1 | タイムスタンプ |
| B1 | 操作内容 |
| C1 | 室温（操作時） |
| D1 | 湿度（操作時） |
| E1 | 不快指数（操作時） |
| F1 | 実行結果 |
| G1 | エラー詳細 |

---

## STEP 7: GAS プロジェクトを開く

### ACTION
スプレッドシートのメニューから以下を選択する

```
拡張機能 → Apps Script
```

### VERIFY
新しいタブで GAS エディタが開き、URL が以下の形式になっていること

```
https://script.google.com/home/projects/【scriptId】/edit
```

`【scriptId】` の部分をコピーしてメモする → STEP 9・STEP 10 で使用する

---

## STEP 8: GAS プロジェクトを命名する

### ACTION
GAS エディタ左上の「無題のプロジェクト」をクリックして以下の名前に変更する

```
SmartHome_GAS
```

「名前を変更」をクリックして確定する

### VERIFY
GAS エディタ左上が `SmartHome_GAS` に変わっていれば完了

---

## STEP 9: GAS プロジェクトをチームメンバーに共有する

### ACTION

#### 9-1. GAS エディタの共有設定を開く
GAS エディタ右上の「共有」ボタンをクリックする

#### 9-2. チームメンバーを編集者として追加する
「ユーザーやグループを追加」の入力欄に、以下のメンバーのGoogleアカウントのメールアドレスを1人ずつ入力する

| メンバー | 権限 |
|---|---|
| 江川 | 編集者 |
| 島崎 | 編集者 |
| 鮫島 | 編集者 |

各メンバーのメールアドレスを入力 → 「編集者」を選択 → 「送信」をクリックする

### VERIFY
共有設定画面に3名が「編集者」として表示されていること

---

## STEP 10: scriptId をチームに共有する

### ACTION
STEP 7 でメモした scriptId を、チームメンバー全員に共有する

共有方法は以下のいずれかを使用する

```
方法A: Discord のチャンネルに投稿する
方法B: README.md に追記してコミット・push する（推奨）
```

#### 方法B の場合: README.md に scriptId を追記する

VS Code で `README.md` を開き、以下の内容を適切な場所に追記する

```markdown
## GAS プロジェクト情報

| 項目 | 値 |
|---|---|
| scriptId | 【ここに scriptId を貼り付ける】 |
| スプレッドシート | SmartHome_Controller |
```

追記後にコミット・push する

```bash
git add README.md
git commit -m "docs: scriptId を README に追記"
git push origin develop
```

### VERIFY
チームメンバーが scriptId を確認できる状態になっていること

---

## STEP 11: ローカルから clasp で GAS に接続する

### ACTION
VS Code のターミナルで以下を実行する

```bash
cd GAS_scripts
clasp clone 【scriptId】
```

`【scriptId】` を STEP 7 でメモした値に置き換えて実行する

### VERIFY

```bash
ls
# Windows の場合
dir
```

| ファイル | 状態 |
|---|---|
| `.clasp.json` が存在する | 接続成功 |
| `appsscript.json` が存在する | GAS と正常に接続されている |

---

## STEP 12: appsscript.json を確認・修正する

### ACTION
`GAS_scripts/appsscript.json` を VS Code で開き、内容を以下と比較する

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

### VERIFY

| 確認項目 | 期待値 | 不一致の場合のアクション |
|---|---|---|
| `timeZone` | `"Asia/Tokyo"` | 上記の値に修正する |
| `runtimeVersion` | `"V8"` | 上記の値に追記または修正する |

内容が一致していれば変更不要。修正した場合は STEP 13 へ進んで push する

---

## STEP 13: 初期ファイルを作成して push する

### ACTION

#### 13-1. モジュールファイルを作成する
`GAS_scripts/` ディレクトリ内に以下のファイルを新規作成する（中身は空でよい）

```bash
cd GAS_scripts
touch main.js sheet.js remo.js sensordata.js aircon.js discord.js
# Windows（PowerShell）の場合
New-Item main.js, sheet.js, remo.js, sensordata.js, aircon.js, discord.js -ItemType File
```

#### 13-2. GAS に push する

```bash
clasp push
```

### VERIFY

| 出力 | 状態 | 次のアクション |
|---|---|---|
| `Pushed X files.` と表示される | push 成功 | STEP 14 へ進む |
| `Error: Invalid credentials` | 認証切れ | `clasp login` を再実行して再試行する |
| `Error: Could not find .clasp.json` | clasp未接続 | STEP 11 に戻る |

GAS エディタ（ブラウザ）をリロードし、`main.gs` など6つのファイルが表示されていることを確認する

---

## STEP 14: GAS トリガーを設定する

### ACTION

#### 14-1. GAS エディタでトリガー設定を開く

```
GAS エディタ左サイドバー → 時計アイコン（トリガー）をクリック
→ 右下の「トリガーを追加」をクリック
```

#### 14-2. トリガーを以下の設定で作成する

| 項目 | 設定値 |
|---|---|
| 実行する関数 | `runEvery5Minutes` |
| 実行するデプロイ | `Head` |
| イベントのソース | `時間主導型` |
| 時間ベースのトリガーのタイプ | `分ベースのタイマー` |
| 時間の間隔 | `5分おき` |

「保存」をクリックする

#### NOTE
`runEvery5Minutes` 関数は `main.js` に実装される関数名と一致していること。実装前に設定しても問題ない。

### VERIFY
トリガー一覧に `runEvery5Minutes` が `5分おき` で登録されていれば完了

---

## STEP 15: 初期ファイルを GitHub に push する

### ACTION

```bash
# リポジトリルートに移動する
cd ..

# 変更をステージングする
git add GAS_scripts/

# コミットする
git commit -m "feat: GAS_scripts 初期ファイルを追加"

# develop ブランチに push する
git push origin develop
```

### VERIFY

```bash
git log --oneline -3
```

最新のコミットに `feat: GAS_scripts 初期ファイルを追加` が表示されていれば完了

---

## COMPLETION CRITERIA

以下がすべて満たされていれば完了

- [ ] `SmartHome_Controller` スプレッドシートが作成されている
- [ ] Settings・SensorLog・OperationLog の3シートが存在し、ヘッダーが入力されている
- [ ] GAS プロジェクト `SmartHome_GAS` が作成されている
- [ ] チームメンバー3名が GAS プロジェクトの編集者として追加されている
- [ ] scriptId が README.md またはDiscordでチームに共有されている
- [ ] `GAS_scripts/` に6つの `.js` ファイルが存在する
- [ ] `clasp push` が成功し、GAS エディタに6つのファイルが表示されている
- [ ] GAS トリガーに `runEvery5Minutes`（5分おき）が登録されている
- [ ] `git push origin develop` が完了している