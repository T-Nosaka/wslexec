// Claude Desktop から stdio で起動され、wsl.exe 経由で WSL上のコマンド/ファイル操作を行う MCPサーバー
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execFile } from "node:child_process";
import { z } from "zod";

// 起動時・クラッシュ時の情報をstderr(=Claude Desktopのログ)に出す
process.stderr.write(`[shellmcp] starting, node=${process.version}\n`);
process.on("uncaughtException", (e) => {
  process.stderr.write(`[shellmcp] uncaughtException: ${e?.stack ?? e}\n`);
});
process.on("unhandledRejection", (e) => {
  process.stderr.write(`[shellmcp] unhandledRejection: ${e?.stack ?? e}\n`);
});

// 対象ディストリビューション名（空ならWSLの既定ディストリ）
const DISTRO = process.env.WSL_DISTRO ?? "";
// 実行ユーザー（空ならWSLの既定ユーザー）
const WSL_USER = process.env.WSL_USER ?? "";

// wsl.exe 共通の先頭引数（-d / -u）を組み立てる
function baseArgs() {
  const args = [];
  if (DISTRO) args.push("-d", DISTRO);
  if (WSL_USER) args.push("-u", WSL_USER);
  return args;
}

// wsl.exe を実行する共通ヘルパ. stdinData を渡すと標準入力へ流し込む（シェル再パースを回避）
function runWsl(extraArgs, { stdinData, timeout_ms, encoding } = {}) {
  const args = [...baseArgs(), ...extraArgs];
  return new Promise((resolve) => {
    const child = execFile(
      "wsl.exe",
      args,
      {
        timeout: timeout_ms ?? 30000,
        maxBuffer: 50 * 1024 * 1024,
        encoding: encoding ?? "utf8",
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        resolve({ err, stdout, stderr });
      }
    );
    if (stdinData !== undefined && child.stdin) {
      child.stdin.write(stdinData);
      child.stdin.end();
    }
  });
}

const server = new McpServer({
  name: "shell-mcp-server",
  version: "1.0.0",
});

// ---- bashコマンド実行（stdin経由なのでエスケープ不要） ----
server.registerTool(
  "run_bash",
  {
    title: "Run Bash",
    description: "WSL上でbashコマンドを実行する。クォートや特殊文字を含むコマンドもそのまま渡せる",
    inputSchema: {
      command: z.string().describe("実行するbashコマンド（複数行可）"),
      cwd: z.string().optional().describe("作業ディレクトリの絶対パス（省略時はホーム）"),
      timeout_ms: z.number().optional().describe("タイムアウト(ms)、デフォルト30000"),
    },
  },
  async ({ command, cwd, timeout_ms }) => {
    // --cd で作業ディレクトリ指定。bash -s でスクリプト本文はstdinから読む
    const extra = [];
    if (cwd) extra.push("--cd", cwd);
    extra.push("--", "bash", "-s");

    const { err, stdout, stderr } = await runWsl(extra, { stdinData: command, timeout_ms });
    if (err) {
      return {
        content: [{ type: "text", text: `エラー: ${err.message}\n${stderr ?? ""}` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: stdout || stderr || "(出力なし)" }] };
  }
);

// ---- ファイル読み込み（catを直接exec。シェルを介さないのでパスが安全） ----
server.registerTool(
  "read_file",
  {
    title: "Read File",
    description: "WSL上のファイルを読み込んで内容を返す",
    inputSchema: {
      path: z.string().describe("読み込むファイルの絶対パス"),
    },
  },
  async ({ path }) => {
    const { err, stdout, stderr } = await runWsl(["--", "cat", "--", path]);
    if (err) {
      return {
        content: [{ type: "text", text: `読み込みエラー: ${err.message}\n${stderr ?? ""}` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: stdout }] };
  }
);

// ---- ファイル書き込み（tee でストリームをファイルへ）　エスケープ不要） ----
server.registerTool(
  "write_file",
  {
    title: "Write File",
    description: "WSL上のファイルに内容を書き込む（既存ファイルは上書き）",
    inputSchema: {
      path: z.string().describe("書き込み先ファイルの絶対パス"),
      content: z.string().describe("ファイルに書き込む内容"),
    },
  },
  async ({ path, content }) => {
    // tee は継承したfd0を直接読むため、-u でのユーザー切替時も権限問題が出ない（stdoutは捨てる）
    const { err, stderr } = await runWsl(["--", "tee", "--", path], { stdinData: content });
    if (err) {
      return {
        content: [{ type: "text", text: `書き込みエラー: ${err.message}\n${stderr ?? ""}` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: `書き込み完了: ${path} (${Buffer.byteLength(content)} bytes)` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
