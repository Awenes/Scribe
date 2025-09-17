// src/scheduler/index.ts
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import * as vscode from "vscode";
import { editHistory } from "../utils/editTracker";

export function startScheduler(
  scribeDir: string,
  outputChannel: vscode.OutputChannel,
  storeIntervalId: (id: NodeJS.Timeout) => void
) {
  // Configurable interval (in minutes) from settings
  const intervalMin =
    vscode.workspace
      .getConfiguration()
      .get<number>("activityTracker.interval") ?? 1;
  const intervalMs = intervalMin * 60 * 1000;

  outputChannel.appendLine(
    `⏳ Scheduler started: logging every ${intervalMin} minutes + daily + weekly checks.`
  );

  let lastDaily = "";
  let lastWeekly = "";

  const intervalId = setInterval(() => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    const day = now.toISOString().slice(0, 10);
    const logFile = path.join(scribeDir, `log-${day}.md`);

    // --- 1. Interval logging ---
    let summary = `### ${now.toLocaleString()}\n\n`;
    if (editHistory.size === 0) {
      summary += "- No editor activity detected.\n\n";
    } else {
      editHistory.forEach((edits, filePath) => {
        summary += `- Edited: ${filePath} (${edits} times)\n`;
      });
      summary += "\n";
    }

    fs.appendFileSync(logFile, summary);
    exec(
      `git add . && git commit -m "Log at ${timestamp}"`,
      { cwd: scribeDir },
      (err) => {
        if (err) outputChannel.appendLine(`Commit error: ${err.message}`);
        else outputChannel.appendLine(`✅ Committed log to ${logFile}`);
      }
    );

    editHistory.clear();

    // --- 2. Daily summary at 00:00 ---
    if (now.getHours() === 0 && now.getMinutes() === 0 && lastDaily !== day) {
      exec(
        'git log --since="yesterday midnight" --until="today midnight" --pretty=format:"- %s"',
        { cwd: scribeDir },
        (err, stdout) => {
          if (err) {
            outputChannel.appendLine("Daily summary error: " + err.message);
            return;
          }

          const summaryFile = path.join(scribeDir, `daily-summary-${day}.md`);
          fs.writeFileSync(
            summaryFile,
            `# Daily Summary (${day})\n\n${stdout}\n`
          );

          exec(`git add . && git commit -m "Daily summary for ${day}"`, {
            cwd: scribeDir,
          });
          outputChannel.appendLine(
            `📅 Generated daily summary: ${summaryFile}`
          );
        }
      );
      lastDaily = day;
    }

    // --- 3. Weekly summary on Sunday 23:59 ---
    if (
      now.getDay() === 0 && // Sunday
      now.getHours() === 23 &&
      now.getMinutes() === 59 &&
      lastWeekly !== day
    ) {
      exec(
        'git log --since="last sunday" --until="this sunday" --pretty=format:"- %s"',
        { cwd: scribeDir },
        (err, stdout) => {
          if (err) {
            outputChannel.appendLine("Weekly summary error: " + err.message);
            return;
          }

          const summaryFile = path.join(scribeDir, `weekly-summary-${day}.md`);
          fs.writeFileSync(
            summaryFile,
            `# Weekly Summary (Week ending ${day})\n\n${stdout}\n`
          );

          exec(`git add . && git commit -m "Weekly summary ending ${day}"`, {
            cwd: scribeDir,
          });
          outputChannel.appendLine(
            `📆 Generated weekly summary: ${summaryFile}`
          );
        }
      );
      lastWeekly = day;
    }
  }, intervalMs);

  storeIntervalId(intervalId);
}
