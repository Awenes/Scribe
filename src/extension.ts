// I tried spliting the code into multiple files, but it didn't work as expected.
// The code is still organized into functions for better readability and maintainability.

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";

// Globals
let intervalId: ReturnType<typeof setInterval> | null = null;
let dailySummaryTimer: NodeJS.Timeout | null = null;
let weeklySummaryTimer: NodeJS.Timeout | null = null;
let editHistory: Map<string, number> = new Map();

// Extension Activation
export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Scribe");
  outputChannel.appendLine("Scribe extension activated.");

  // Setup workspace-aware logging
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }
  const workspacePath = workspaceFolders[0].uri.fsPath;
  const workspaceName = path.basename(workspacePath);
  const scribeDir = path.join(os.homedir(), ".scribe", workspaceName);

  initializeRepo(scribeDir, outputChannel);
  setupFileEventListeners();
  setupStatusBar(context);
  setupIntervalLogging(scribeDir, outputChannel);
  scheduleDailySummary(scribeDir, outputChannel);
  scheduleWeeklySummary(scribeDir, outputChannel);
  registerCommands(context, scribeDir);

  context.subscriptions.push(outputChannel);
}

// Extension Deactivation
export function deactivate() {
  if (intervalId) clearInterval(intervalId);
  if (dailySummaryTimer) clearTimeout(dailySummaryTimer);
  if (weeklySummaryTimer) clearTimeout(weeklySummaryTimer);
}

// --- Initialization ---
function initializeRepo(scribeDir: string, output: vscode.OutputChannel) {
  if (!fs.existsSync(scribeDir)) {
    fs.mkdirSync(scribeDir, { recursive: true });
    exec("git init", { cwd: scribeDir }, (err) => {
      if (err) output.appendLine("Failed to init git repo: " + err.message);
      else output.appendLine("Initialized Git repo in .scribe");
    });
  }
}

function setupFileEventListeners() {
  vscode.workspace.onDidChangeTextDocument((e) => {
    const filePath = e.document.uri.fsPath;
    const current = editHistory.get(filePath) ?? 0;
    editHistory.set(filePath, current + 1);
  });

  vscode.workspace.onDidOpenTextDocument((doc) => {
    const filePath = doc.uri.fsPath;
    if (!editHistory.has(filePath)) editHistory.set(filePath, 0);
  });
}

function setupStatusBar(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(pencil) Scribe active";
  statusBarItem.tooltip = "Tracking activity logs";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

// --- Logging ---
function setupIntervalLogging(
  scribeDir: string,
  outputChannel: vscode.OutputChannel
) {
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
        if (err) outputChannel.appendLine(`Commit error: ${err.message}`);
        else outputChannel.appendLine(`Committed log to ${filename}`);
      }
    );

    editHistory.clear();
  }, intervalMs);
}

// --- Summaries ---
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
      'git log --since=midnight --pretty=format:"- %s"',
      { cwd: scribeDir },
      (err, stdout) => {
        if (err) {
          outputChannel.appendLine("Daily summary error: " + err.message);
          return;
        }
        const day = new Date().toISOString().slice(0, 10);
        const summaryFile = path.join(scribeDir, `daily-summary-${day}.md`);
        fs.writeFileSync(
          summaryFile,
          `# Daily Summary (${day})\n\n${stdout}\n`
        );
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
      'git log --since="7 days ago" --pretty=format:"- %s"',
      { cwd: scribeDir },
      (err, stdout) => {
        if (err) {
          outputChannel.appendLine("Weekly summary error: " + err.message);
          return;
        }
        const day = new Date().toISOString().slice(0, 10);
        const summaryFile = path.join(scribeDir, `weekly-summary-${day}.md`);
        fs.writeFileSync(
          summaryFile,
          `# Weekly Summary (Week ending ${day})\n\n${stdout}\n`
        );
        outputChannel.appendLine(`Generated weekly summary: ${summaryFile}`);
      }
    );
    scheduleWeeklySummary(scribeDir, outputChannel);
  }, millisUntilSundayNight);
}

// --- Git Utilities ---
function execPromise(
  cmd: string,
  options: any = {}
): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    exec(cmd, options, (err, stdout) => {
      if (err) reject(err);
      else resolve({ stdout: stdout.toString() });
    });
  });
}

// --- Commands ---
function registerCommands(context: vscode.ExtensionContext, scribeDir: string) {
  context.subscriptions.push(
    vscode.commands.registerCommand("Scribe.restoreSnapshot", async () => {
      try {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
          vscode.window.showErrorMessage("No workspace folder open.");
          return;
        }

        const { stdout: logOutput } = await execPromise(
          'git log --pretty=format:"%h %ad | %s" --date=short',
          { cwd: scribeDir }
        );

        const commits = logOutput
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => line.trim());

        const selectedCommit = await vscode.window.showQuickPick(commits, {
          placeHolder: "Select a snapshot to inspect",
        });
        if (!selectedCommit) return;

        const commitHash = selectedCommit.split(" ")[0];

        const { stdout: diffOutput } = await execPromise(
          `git show --stat ${commitHash}`,
          { cwd: scribeDir }
        );

        const preview = await vscode.window.showInformationMessage(
          `Changes in ${commitHash}:\n\n${diffOutput}`,
          "Restore This Snapshot",
          "Create Branch From This"
        );

        if (preview === "Create Branch From This") {
          const branchName = await vscode.window.showInputBox({
            prompt: "Enter new branch name",
          });
          if (branchName) {
            await execPromise(`git branch ${branchName} ${commitHash}`, {
              cwd: scribeDir,
            });
            vscode.window.showInformationMessage(
              `Branch '${branchName}' created from ${commitHash}`
            );
          }
        } else if (preview === "Restore This Snapshot") {
          await execPromise(`git checkout ${commitHash}`, { cwd: scribeDir });
          vscode.window.showInformationMessage(
            `Restored snapshot at ${commitHash}`
          );
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("Scribe.showDiff", async () => {
      exec(
        "git log --pretty=format:'%h %s' -n 5",
        { cwd: scribeDir },
        async (err, stdout) => {
          if (err) {
            vscode.window.showErrorMessage(
              "Error loading history: " + err.message
            );
            return;
          }
          const commits = stdout.trim().split("\n");
          if (commits.length < 2) {
            vscode.window.showInformationMessage(
              "Need at least two commits to show a diff."
            );
            return;
          }

          const selected = await vscode.window.showQuickPick(commits, {
            canPickMany: true,
            placeHolder: "Select two commits to diff",
          });

          if (!selected || selected.length !== 2) {
            vscode.window.showInformationMessage(
              "Please select exactly two commits."
            );
            return;
          }

          const [hash1, hash2] = selected.map((item) => item.split(" ")[0]);

          exec(
            `git diff ${hash2} ${hash1}`,
            { cwd: scribeDir },
            async (err, diff) => {
              if (err) {
                vscode.window.showErrorMessage("Diff failed: " + err.message);
                return;
              }
              const doc = await vscode.workspace.openTextDocument({
                content: diff,
                language: "diff",
              });
              vscode.window.showTextDocument(doc);
            }
          );
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("Scribe.helloWorld", () => {
      vscode.window.showInformationMessage("Hello from Scribe!");
    })
  );
}
