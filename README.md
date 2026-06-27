# wslexec - WSL MCP Server for Claude Desktop

[English](#english) | [日本語](#日本語)

---

## English

**wslexec** is an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that enables Claude Desktop to execute commands and read/write files on **Windows Subsystem for Linux (WSL)**.

### Features

- Run any bash command on WSL via `wsl.exe`
- Read files from the WSL filesystem
- Write files to the WSL filesystem
- Supports specifying WSL distribution and user
- Configurable command timeout

### Prerequisites

- Windows with WSL installed
- [Node.js](https://nodejs.org/) (runtime for the MCP server)
- [Claude Desktop](https://claude.ai/download) with mcpb support

### Installation

#### Option 1: Install as mcpb extension (recommended)

1. Clone or download this repository
2. Install dependencies:

```bash
npm install @modelcontextprotocol/sdk zod
```

3. Build mcpb package:

```bash
npx @anthropic-ai/mcpb pack
```

   A file named `wslexec.mcpb` will be generated in the parent directory.

4. Install the generated `.mcpb` file into Claude Desktop by double-clicking or using the Extensions menu.

> Note: `mcpb init` is unnecessary as `manifest.json` is already included in the repository.

### Tools

| Tool | Description |
|------|-------------|
| `run_bash` | Execute a bash command on WSL |
| `read_file` | Read a file on the WSL filesystem |
| `write_file` | Write content to a file on WSL (overwrites existing) |

### Configuration (environment variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `WSL_DISTRO` | (default distro) | Target WSL distribution name |
| `WSL_USER` | (default user) | Linux user to run commands as |
| `WSL_TIMEOUT_MS` | `120000` | Command timeout in milliseconds |

### stdin-based design (important)

This server communicates with WSL via **stdin piping**, not shell argument escaping. This means:

- No need to escape special characters or quotes
- Shell injection is prevented
- Commands with newlines, pipes, redirects work naturally
- No noisy stdout/stderr from the server itself — all diagnostic output goes to `stderr`

### License

MIT

---

## 日本語

**wslexec** は、Claude Desktop が **WSL (Windows Subsystem for Linux)** 上の bash コマンド実行やファイル操作を行えるようにする MCP (Model Context Protocol) サーバーです。

### 機能

- WSL 上での bash コマンド実行
- WSL ファイルシステム上のファイル読み込み
- WSL ファイルシステムへのファイル書き込み
- WSL ディストリビューション・ユーザーの指定対応
- タイムアウト設定可能

### 前提条件

- WSL がインストールされた Windows 環境
- [Node.js](https://nodejs.org/)
- mcpb 対応の [Claude Desktop](https://claude.ai/download)

### インストール方法

#### 方法1: mcpb 拡張機能としてインストール (推奨)

1. このリポジトリをクローンまたはダウンロード
2. 依存関係をインストール:

```bash
npm install @modelcontextprotocol/sdk zod
```

3. mcpb パッケージをビルド:

```bash
npx @anthropic-ai/mcpb pack
```

   親ディレクトリに `wslexec.mcpb` ファイルが生成されます。

4. 生成された `.mcpb` ファイルをダブルクリック、または Claude Desktop の拡張機能メニューからインストール。

> `mcpb init` は不要です。このリポジトリには既に `manifest.json` が含まれているためです。

### ツール一覧

| ツール | 説明 |
|--------|------|
| `run_bash` | WSL 上で bash コマンドを実行 |
| `read_file` | WSL 上のファイルを読み込む |
| `write_file` | WSL 上のファイルに書き込む（既存ファイルは上書き） |

### 設定項目（環境変数）

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `WSL_DISTRO` | (既定ディストリ) | 対象の WSL ディストリ名 |
| `WSL_USER` | (既定ユーザー) | 実行する Linux ユーザー名 |
| `WSL_TIMEOUT_MS` | `120000` | コマンド実行のタイムアウト (ミリ秒) |

### 標準入力ベースの設計について

このサーバーはシェル引数のエスケープではなく、**標準入力 (stdin) 経由**で WSL と通信します。これにより:

- 特殊文字やクォートのエスケープが不要
- シェルインジェクションを防止
- 改行・パイプ・リダイレクトを含むコマンドもそのまま動作
- サーバー自身の余計な出力は一切 stdout に出さず、すべて stderr に出力（MCP プロトコルに影響なし）

### ライセンス

MIT
