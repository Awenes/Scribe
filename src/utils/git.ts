import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import * as vscode from "vscode";

/**
 * Initialize a git repo in the given directory if it doesn't exist.
 * Logs errors and actions to the provided OutputChannel.
 */
export function initializeRepo(
  dir: string,
  outputChannel: vscode.OutputChannel
) {
  try {
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      outputChannel.appendLine(`📁 Created Scribe directory: ${dir}`);
    }

    // Check if .git exists
    const gitDir = path.join(dir, ".git");
    if (!fs.existsSync(gitDir)) {
      execSync("git init", { cwd: dir });
      outputChannel.appendLine(`✅ Initialized new git repository in ${dir}`);

      // Optional: create an initial README or empty log
      const initialFile = path.join(dir, "README.md");
      if (!fs.existsSync(initialFile)) {
        fs.writeFileSync(initialFile, "# Scribe Logs\n\nInitial commit.\n");
        execSync("git add . && git commit -m 'Initial commit'", { cwd: dir });
        outputChannel.appendLine(`📄 Created initial README.md and committed.`);
      }
    } else {
      outputChannel.appendLine(
        "ℹ️ Git repository already exists, skipping init."
      );
    }
  } catch (err: any) {
    outputChannel.appendLine("❌ Git initialization error: " + err.message);
    vscode.window.showErrorMessage(
      "Error initializing Scribe git repo: " + err.message
    );
  }
}
