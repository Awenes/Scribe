// src/scheduler/summaries.ts
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import * as vscode from "vscode";

export function scheduleDailySummary(
  scribeDir: string,
  outputChannel: vscode.OutputChannel,
  storeTimer: (id: NodeJS.Timeout) => void
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

  const timer = setTimeout(() => {
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
    scheduleDailySummary(scribeDir, outputChannel, storeTimer);
  }, millisUntilMidnight);

  storeTimer(timer);
}

export function scheduleWeeklySummary(
  scribeDir: string,
  outputChannel: vscode.OutputChannel,
  storeTimer: (id: NodeJS.Timeout) => void
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

  const timer = setTimeout(() => {
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
    scheduleWeeklySummary(scribeDir, outputChannel, storeTimer);
  }, millisUntilSundayNight);

  storeTimer(timer);
}
