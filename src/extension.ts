import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";

let intervalId: ReturnType<typeof setInterval> | null = null;
let editHistory: Map<string, number> = new Map();

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Scribe");
  outputChannel.appendLine("Scribe extension activated.");

  const scribeDir = path.join(os.homedir(), ".scribe");

  // 1. Ensure .scribe Git repo exists
  if (!fs.existsSync(scribeDir)) {
    fs.mkdirSync(scribeDir);
    exec("git init", { cwd: scribeDir }, (err) => {
      if (err) {
        outputChannel.appendLine("Failed to init git repo: " + err.message);
      } else {
        outputChannel.appendLine("Initialized Git repo in .scribe");
      }
    });
  }

  // 2. Register file change event
  vscode.workspace.onDidChangeTextDocument((e) => {
    const filePath = e.document.uri.fsPath;
    const current = editHistory.get(filePath) ?? 0;
    editHistory.set(filePath, current + 1);
  });

  // 3. Register file open event
  vscode.workspace.onDidOpenTextDocument((doc) => {
    const filePath = doc.uri.fsPath;
    if (!editHistory.has(filePath)) {
      editHistory.set(filePath, 0);
    }
  });

  // 4. Status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(pencil) Scribe active";
  statusBarItem.tooltip = "Tracking activity logs";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 5. Interval setup
  const intervalMin =
    vscode.workspace
      .getConfiguration()
      .get<number>("activityTracker.interval") ?? 30;
  const intervalMs = intervalMin * 60 * 1000;
  outputChannel.appendLine(`Logging every ${intervalMin} minutes.`);

  intervalId = setInterval(() => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    const day = now.toISOString().slice(0, 10); // e.g., 2025-07-30
    const filename = `log-${day}.md`;
    const filepath = path.join(scribeDir, filename);

    let summary = `### ${now.toLocaleString()}\n\n`;

    if (editHistory.size === 0) {
      summary += "- No editor activity detected.\n\n";
    } else {
      editHistory.forEach((edits, filePath) => {
        summary += `- Edited: ${filePath} (${edits} times)\n`;
      });
      summary += "\n";
    }

    fs.appendFileSync(filepath, summary);

    exec(
      `git add . && git commit -m "Log at ${timestamp}"`,
      { cwd: scribeDir },
      (err) => {
        if (err) {
          outputChannel.appendLine(`Commit error: ${err.message}`);
        } else {
          outputChannel.appendLine(`Committed log to ${filename}`);
        }
      }
    );

    editHistory.clear();
  }, intervalMs);

  // 6. Hello command still available
  const disposable = vscode.commands.registerCommand(
    "Scribe.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello from Scribe!");
    }
  );

  context.subscriptions.push(disposable, outputChannel);
}

export function deactivate() {
  if (intervalId) {
    clearInterval(intervalId);
  }
}
