// src/extension.ts
import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";

import { initializeRepo } from "./utils/git";
import {
  setupFileEventListeners,
  editHistory,
} from "./utils/editTracker";
import { setupStatusBar } from "./utils/statusBar";
import { setupIntervalLogging } from "./scheduler/logInterval";
import {
  scheduleDailySummary,
  scheduleWeeklySummary,
} from "./scheduler/summaries";
import { registerCommands } from "./utils/commands";

let intervalId: ReturnType<typeof setInterval> | null = null;
let dailySummaryTimer: NodeJS.Timeout | null = null;
let weeklySummaryTimer: NodeJS.Timeout | null = null;
let scribeDir: string = "";

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Scribe");
  outputChannel.appendLine("Scribe extension activated.");

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  const workspaceName = path.basename(workspacePath);
  scribeDir = path.join(os.homedir(), ".scribe", workspaceName);

  initializeRepo(scribeDir, outputChannel);
  setupFileEventListeners();
  setupStatusBar(context);
  setupIntervalLogging(scribeDir, outputChannel, (id) => (intervalId = id));
  scheduleDailySummary(
    scribeDir,
    outputChannel,
    (id) => (dailySummaryTimer = id)
  );
  scheduleWeeklySummary(
    scribeDir,
    outputChannel,
    (id) => (weeklySummaryTimer = id)
  );
  registerCommands(context, scribeDir);

  context.subscriptions.push(outputChannel);
}

export function deactivate() {
  if (intervalId) clearInterval(intervalId);
  if (dailySummaryTimer) clearTimeout(dailySummaryTimer);
  if (weeklySummaryTimer) clearTimeout(weeklySummaryTimer);

  if (editHistory.size > 0 && scribeDir) {
    const fs = require("fs");
    const path = require("path");
    const { exec } = require("child_process");
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    const day = now.toISOString().slice(0, 10);
    const filename = `log-${day}.md`;
    const filepath = path.join(scribeDir, filename);

    let summary = `### Final Log: ${now.toLocaleString()}\n\n`;
    editHistory.forEach((edits, filePath) => {
      summary += `- Edited: ${filePath} (${edits} times)\n`;
    });

    fs.appendFileSync(filepath, summary);
    exec(`git add . && git commit -m "Final log at ${timestamp}"`, {
      cwd: scribeDir,
    });
    editHistory.clear();
  }
}
