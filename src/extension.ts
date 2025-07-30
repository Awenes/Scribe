import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";

let intervalId: ReturnType<typeof setInterval> | null = null;
let dailySummaryTimer: NodeJS.Timeout | null = null;
let weeklySummaryTimer: NodeJS.Timeout | null = null;
let editHistory: Map<string, number> = new Map();

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Scribe");
  outputChannel.appendLine("Scribe extension activated.");

  // 1. Determine global .scribe directory
  const baseScribeDir = path.join(os.homedir(), ".scribe");

  // 2. Get workspace name and create subdirectory
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }
  const workspacePath = workspaceFolders[0].uri.fsPath;
  const workspaceName = path.basename(workspacePath);
  const scribeDir = path.join(baseScribeDir, workspaceName);

  if (!fs.existsSync(scribeDir)) {
    fs.mkdirSync(scribeDir, { recursive: true });
    exec("git init", { cwd: scribeDir }, (err) => {
      if (err) {
        outputChannel.appendLine("Failed to init git repo: " + err.message);
      } else {
        outputChannel.appendLine("Initialized Git repo in .scribe");
      }
    });
  }

  // 3. Track file changes
  vscode.workspace.onDidChangeTextDocument((e) => {
    const filePath = e.document.uri.fsPath;
    const current = editHistory.get(filePath) ?? 0;
    editHistory.set(filePath, current + 1);
  });

  // 4. Track file opens
  vscode.workspace.onDidOpenTextDocument((doc) => {
    const filePath = doc.uri.fsPath;
    if (!editHistory.has(filePath)) {
      editHistory.set(filePath, 0);
    }
  });

  // 5. Show status bar
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(pencil) Scribe active";
  statusBarItem.tooltip = "Tracking activity logs";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 6. Interval logging setup
  const intervalMin =
    vscode.workspace
      .getConfiguration()
      .get<number>("activityTracker.interval") ?? 1;
  const intervalMs = intervalMin * 60 * 1000;
  outputChannel.appendLine(`Logging every ${intervalMin} minutes.`);

  intervalId = setInterval(() => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    const day = now.toISOString().slice(0, 10);
    const filename = `log-${day}.md`;
    const filepath = path.join(scribeDir, filename);

    let summary = `### ${now.toLocaleString()}
\n`;

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

  // 7. Daily summary generator (23:59)
  scheduleDailySummary(scribeDir, outputChannel);

  // 8. Weekly summary generator (Sundays at 23:59)
  scheduleWeeklySummary(scribeDir, outputChannel);

  // 9. Hello command
  const disposable = vscode.commands.registerCommand(
    "Scribe.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello from Scribe!");
    }
  );

  context.subscriptions.push(disposable, outputChannel);
}

export function deactivate() {
  if (intervalId) clearInterval(intervalId);
  if (dailySummaryTimer) clearTimeout(dailySummaryTimer);
  if (weeklySummaryTimer) clearTimeout(weeklySummaryTimer);
}

function scheduleDailySummary(
  scribeDir: string,
  outputChannel: vscode.OutputChannel
) {
  const now = new Date();
  const millisUntilMidnight =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0
    ).getTime() - now.getTime();

  dailySummaryTimer = setTimeout(() => {
    exec(
      `git log --since=midnight --pretty=format:"- %s"`,
      { cwd: scribeDir },
      (err, stdout) => {
        if (err) {
          outputChannel.appendLine("Daily summary error: " + err.message);
          return;
        }
        const day = new Date().toISOString().slice(0, 10);
        const summaryFile = path.join(scribeDir, `daily-summary-${day}.md`);
        const content = `# Daily Summary (${day})\n\n${stdout}\n`;
        fs.writeFileSync(summaryFile, content);
        outputChannel.appendLine(`Generated daily summary: ${summaryFile}`);
      }
    );
    scheduleDailySummary(scribeDir, outputChannel);
  }, millisUntilMidnight);
}

function scheduleWeeklySummary(
  scribeDir: string,
  outputChannel: vscode.OutputChannel
) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  const nextSunday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilSunday,
    23,
    59,
    0
  );
  const millisUntilSundayNight = nextSunday.getTime() - now.getTime();

  weeklySummaryTimer = setTimeout(() => {
    exec(
      `git log --since="7 days ago" --pretty=format:"- %s"`,
      { cwd: scribeDir },
      (err, stdout) => {
        if (err) {
          outputChannel.appendLine("Weekly summary error: " + err.message);
          return;
        }
        const day = new Date().toISOString().slice(0, 10);
        const summaryFile = path.join(scribeDir, `weekly-summary-${day}.md`);
        const content = `# Weekly Summary (Week ending ${day})\n\n${stdout}\n`;
        fs.writeFileSync(summaryFile, content);
        outputChannel.appendLine(`Generated weekly summary: ${summaryFile}`);
      }
    );
    scheduleWeeklySummary(scribeDir, outputChannel);
  }, millisUntilSundayNight);
}
