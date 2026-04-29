# 文書メタデータ

- 文書名: setup_git_config
- 位置づけ: Git初期設定 / クローン / clasp初期化の手順書
- 正本/補助: 正本
- 最終更新: 2026-04-27

# setup_git_config: Git設定・リポジトリのクローン・clasp環境構築

## CONTEXT

- 対象: チームメンバー全員（各自が自分のPCで実行）
- 目的: Gitの初期設定、リポジトリのクローン、GAS API有効化、claspのセットアップを行う
- 実行環境: ターミナル（VS Code 内蔵ターミナルを使用する）/ ブラウザ
- 前提条件:
  - Git がインストール済みであること
  - GitHubアカウントを持っており、リポジトリへのアクセス権限（招待承認済み）があること
  - Node.js がインストール済みであること（未確認の場合は STEP 1 で確認する）
  - scriptId がチームリーダーから共有されていること

---

## STEP 1: ターミナルを開き、環境を確認する

### ACTION
VS Code のターミナルを開く

```
メニュー: ターミナル → 新しいターミナル
キーボード:
  Windows/Linux: Ctrl + `
  macOS:         Cmd  + `
```

以下のコマンドを順に実行する

```bash
git --version
node -v
npm -v
```

### VERIFY

| コマンド | 期待される出力の形式 | 出力されない場合のアクション |
|---|---|---|
| `git --version` | `git version 2.x.x` | Git が未インストール。https://git-scm.com からインストールする |
| `node -v` | `v18.x.x` 以上 | Node.js が未インストール。https://nodejs.org/en からLTS版をインストールする |
| `npm -v` | `9.x.x` 以上 | Node.js と同時にインストールされるため、node -v が通れば通常表示される |

3つすべてバージョンが表示されたら STEP 2 へ進む

---

## STEP 2: Git のユーザー情報を設定する

### PRECONDITION
以下のコマンドで設定済みか確認する

```bash
git config --global user.name
git config --global user.email
```

### VERIFY

| 出力 | 状態 | 次のアクション |
|---|---|---|
| 名前・メールアドレスが表示される | 設定済み | STEP 3 へスキップ |
| 何も表示されない（空白） | 未設定 | 以下の ACTION を実行する |

### ACTION
以下のコマンドの `"Your Name"` と `"your@email.com"` を自分の情報に書き換えて実行する

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

#### NOTE
- `user.name` は日本語でも可（例: `"山田 太郎"`）
- `user.email` は **GitHubアカウントに登録しているメールアドレス** を使用すること
- 異なるメールアドレスを使うとGitHub上でコミットが自分のアカウントに紐付かない

### VERIFY（設定後）
以下を実行して入力した内容が表示されることを確認する

```bash
git config --global user.name
git config --global user.email
```

正しく表示されたら STEP 3 へ進む

---

## STEP 3: リポジトリをクローンする

### PRECONDITION
- GitHubの招待メールを承認済みであること
- 招待が未承認の場合: GitHubのメール通知またはGitHub右上の🔔通知から「Accept invitation」を押してから進む

### ACTION

#### 3-1. クローン先のディレクトリに移動する

任意の作業ディレクトリに移動する。以下はDocumentsフォルダの例:

```bash
# Windows
cd C:\Users\ユーザー名\Documents

# macOS / Linux
cd ~/Documents
```

#### 3-2. リポジトリをクローンする

```bash
git clone https://github.com/RUSAEXP1EMB2026/【リポジトリ名】.git
```

#### NOTE
- `【リポジトリ名】` は担当のリポジトリ名に置き換える（例: `repo01`）
- 実行するとGitHubの認証を求められる場合がある

#### 3-3. 認証の処理

| 認証方法 | 対応 |
|---|---|
| ブラウザが自動で開く | GitHubアカウントでサインインして「Authorize」をクリックする |
| ターミナルでユーザー名・パスワードを求められる | ユーザー名はGitHubのユーザー名、パスワードは後述のPersonal Access Token（PAT）を使用する |
| 何も起きずにクローンが完了する | 認証済み状態のため不要 |

#### PATが必要な場合の取得手順

```
https://github.com/settings/tokens
→ 「Generate new token (classic)」をクリック
→ Note: 任意の名前（例: git-clone-token）
→ Expiration: 90 days
→ スコープ: 「repo」にチェック
→ 「Generate token」をクリック
→ 表示されたトークンをコピーして、パスワードの代わりに貼り付ける
```

### VERIFY
以下を実行してフォルダが作成されていることを確認する

```bash
ls
# Windows の場合
dir
```

`【リポジトリ名】` のフォルダが表示されたらクローン成功 → STEP 4 へ進む

---

## STEP 4: クローンしたリポジトリを VS Code で開く

### ACTION

```bash
cd 【リポジトリ名】
code .
```

### VERIFY
VS Code が新しいウィンドウで開き、左のファイルツリーに `README.md` や `GAS_scripts/` などが表示されていれば成功 → STEP 5 へ進む

---

## STEP 5: 自分の作業ブランチを作成する

### PRECONDITION
担当ブランチ名を以下の表で確認する

| 担当者 | ブランチ名 |
|---|---|
| 朝倉 | `feature/gas-logic` |
| 江川 | `feature/sensor` |
| 島崎 | `feature/aircon` |
| 鮫島 | `feature/discord` |

### ACTION

```bash
# develop ブランチの最新を取得する
git checkout develop
git pull origin develop

# 自分の feature ブランチを作成して切り替える
git checkout -b feature/◯◯
```

`feature/◯◯` を上記の表の自分のブランチ名に置き換えて実行する

### VERIFY

```bash
git branch
```

| 出力 | 状態 | 次のアクション |
|---|---|---|
| `* feature/◯◯` が表示される（`*` は現在のブランチを示す） | 正常 | STEP 6 へ進む |
| `* develop` のまま | ブランチ作成失敗 | `git checkout -b feature/◯◯` を再実行する |

---

## STEP 6: GAS API を有効化する

### ACTION
以下のURLを **開発で使用するGoogleアカウント** でログインした状態で開く

```
https://script.google.com/home/usersettings
```

「Google Apps Script API」のトグルを **オン** にする

### VERIFY

| トグルの状態 | 次のアクション |
|---|---|
| オン（青色） | STEP 7 へ進む |
| オフ（グレー） | クリックしてオンにしてから STEP 7 へ進む |

---

## STEP 7: clasp をインストールする

### ACTION
VS Code のターミナルで以下を実行する

```bash
npm install -g @google/clasp
```

#### macOS で Permission エラーが出た場合

```bash
sudo npm install -g @google/clasp
```

パスワードを求められたらMacのログインパスワードを入力する

### VERIFY

```bash
clasp --version
```

バージョン番号（例: `2.x.x`）が表示されたらインストール成功 → STEP 8 へ進む

---

## STEP 8: Windows のみ — PowerShell 実行ポリシーを変更する

### PRECONDITION
macOS / Linux の場合はこの STEP をスキップして STEP 9 へ進む

### ACTION
PowerShell を **管理者として実行** する

```
スタートメニューで「PowerShell」を検索
→ 右クリック →「管理者として実行」を選択
```

以下を順に実行する

```powershell
# 現在のポリシーを確認する
Get-ExecutionPolicy

# RemoteSigned に変更する
Set-ExecutionPolicy -Scope CurrentUser
# → 入力を求められたら「RemoteSigned」と入力して Enter を押す

# 変更を確認する
Get-ExecutionPolicy
```

### VERIFY

| `Get-ExecutionPolicy` の出力 | 状態 | 次のアクション |
|---|---|---|
| `RemoteSigned` | 設定完了 | STEP 9 へ進む |
| `Restricted` のまま | 変更失敗 | 管理者権限で PowerShell を起動できているか確認して再試行する |

---

## STEP 9: clasp でGoogleアカウントにログインする

### ACTION

```bash
clasp login
```

ブラウザが自動で開く

### VERIFY

| ブラウザの表示 | アクション |
|---|---|
| Googleアカウントの選択画面 | 開発で使用するGoogleアカウントを選択する |
| 権限の許可画面 | 「許可」または「Allow」をクリックする |
| 「Logged in! You may close this tab.」と表示される | 認証完了。ターミナルに戻る |

ターミナルに `Default credentials saved to` というメッセージが表示されたら成功 → STEP 10 へ進む

---

## STEP 10: clasp で GAS プロジェクトをクローンする

### PRECONDITION
チームリーダーから scriptId が共有されていること

### ACTION

```bash
# GAS_scripts/ ディレクトリに移動する
cd GAS_scripts

# GAS プロジェクトをクローンする
clasp clone 【scriptId】
```

`【scriptId】` をリーダーから共有された文字列に置き換えて実行する

### VERIFY

```bash
ls
# Windows の場合
dir
```

| ファイル | 状態 |
|---|---|
| `.clasp.json` が存在する | clasp クローン成功 |
| `appsscript.json` が存在する | GAS プロジェクトと正常に接続されている |

両方存在したら STEP 11 へ進む

---

## STEP 11: .clasp.json が .gitignore に含まれているか確認する

### PRECONDITION
`.clasp.json` には認証情報が含まれているため、**絶対にGitHubにコミットしてはいけない**

### ACTION
リポジトリルートの `.gitignore` ファイルを VS Code で開いて確認する

```bash
# リポジトリルートに移動
cd ..

# .gitignore の内容を確認する
cat .gitignore
```

### VERIFY

| 確認内容 | 状態 | アクション |
|---|---|---|
| `.clasp.json` の記述がある | 安全 | STEP 12 へ進む |
| `.clasp.json` の記述がない | 危険 | 以下の対応を行う |

#### `.clasp.json` が .gitignore に含まれていない場合の対応

```bash
# .gitignore に追記する
echo ".clasp.json" >> .gitignore

# 追跡対象から除外する（すでにコミットされていた場合）
git rm --cached GAS_scripts/.clasp.json

# コミットする
git add .gitignore
git commit -m "fix: .clasp.json を .gitignore に追加"
```

---

## STEP 12: clasp の動作確認をする

### ACTION

```bash
cd GAS_scripts
clasp status
```

### VERIFY

| 出力 | 状態 | 次のアクション |
|---|---|---|
| ファイルの一覧が表示される | 正常動作 | 完了 ✅ |
| `Error: Could not find .clasp.json` | claspクローン未完了 | STEP 10 に戻る |
| `Error: Invalid credentials` | 認証切れ | `clasp login` を再実行して STEP 12 を再試行する |

---

## COMPLETION CRITERIA

以下がすべて満たされていれば完了

- [ ] `git --version` でバージョンが表示される
- [ ] `git config --global user.name` と `user.email` が正しく設定されている
- [ ] リポジトリがローカルにクローンされ、VS Code で開ける
- [ ] 自分の `feature/◯◯` ブランチが作成されている
- [ ] `https://script.google.com/home/usersettings` で GAS API がオンになっている
- [ ] `clasp --version` でバージョンが表示される
- [ ] `GAS_scripts/.clasp.json` が存在し、`.gitignore` に記載されている
- [ ] `clasp status` でエラーが出ない