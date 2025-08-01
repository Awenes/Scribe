// src/scheduler/logInterval.ts
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import * as vscode from "vscode";
import { editHistory } from "../utils/editTracker";

export function setupIntervalLogging(
  scribeDir: string,
  outputChannel: vscode.OutputChannel,
  storeIntervalId: (id: NodeJS.Timeout) => void
) {
  const intervalMin =
    vscode.workspace
      .getConfiguration()
      .get<number>("activityTracker.interval") ?? 1;
  const intervalMs = intervalMin * 60 * 1000;
  outputChannel.appendLine(`Logging every ${intervalMin} minutes.`);

  const intervalId = setInterval(() => {
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

  storeIntervalId(intervalId);
}
