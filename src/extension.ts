import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

import { initializeRepo } from "./utils/git";
import { setupFileEventListeners, editHistory } from "./utils/editTracker";
import { setupStatusBar } from "./utils/statusBar";
import { startScheduler } from "./scheduler";
import { registerCommands } from "./utils/commands";

let schedulerId: NodeJS.Timeout | null = null;
let scribeDir: string = "";

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Scribe");
  context.subscriptions.push(outputChannel);
  outputChannel.show(true);

  outputChannel.appendLine("🔹 Activating Scribe extension...");

  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage("No workspace is open.");
      outputChannel.appendLine(
        "❌ No workspace folder found. Activation aborted."
      );
      return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const workspaceName = path.basename(workspacePath);
    scribeDir = path.join(os.homedir(), ".scribe", workspaceName);

    // Ensure .scribe directory exists
    if (!fs.existsSync(scribeDir)) {
      fs.mkdirSync(scribeDir, { recursive: true });
      outputChannel.appendLine(`📁 Created Scribe directory: ${scribeDir}`);
    }

    // Initialize git repo (safe)
    initializeRepo(scribeDir, outputChannel);

    // Setup file listeners and status bar
    setupFileEventListeners();
    setupStatusBar(context);

    // Start scheduler safely
    startScheduler(scribeDir, outputChannel, (id) => (schedulerId = id));

    // Register commands
    registerCommands(context, scribeDir);

    vscode.window.showInformationMessage("Scribe activated successfully!");
    outputChannel.appendLine("✅ Scribe activated.");
  } catch (err: any) {
    vscode.window.showErrorMessage(`Error activating Scribe: ${err.message}`);
    outputChannel.appendLine("❌ Activation error: " + err.stack);
  }
}

export function deactivate() {
  if (schedulerId) clearInterval(schedulerId);

  if (editHistory.size > 0 && scribeDir) {
    try {
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const timestamp = now.toISOString().replace(/[:.]/g, "-");
      const filepath = path.join(scribeDir, `log-${day}.md`);

      let summary = `### Final Log: ${now.toLocaleString()}\n\n`;
      editHistory.forEach((edits, filePath) => {
        summary += `- Edited: ${filePath} (${edits} times)\n`;
      });

      fs.appendFileSync(filepath, summary);
      editHistory.clear();

      const { execSync } = require("child_process");
      execSync(`git add . && git commit -m "Final log at ${timestamp}"`, {
        cwd: scribeDir,
      });
    } catch (err: any) {
      console.error("Error during deactivate:", err.message);
    }
  }
}
