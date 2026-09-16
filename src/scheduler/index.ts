import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { editHistory, buildEditSummary } from "../utils/editTracker";
import { runGit, commitAll } from "../utils/git";

function getWeekKey(d: Date): string {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d.getTime() - oneJan.getTime()) / 86400000);
  const week = Math.ceil((dayOfYear + oneJan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

async function generateDailySummary(
  scribeDir: string,
  day: string,
  outputChannel: vscode.OutputChannel
) {
  const summaryFile = path.join(scribeDir, `daily-summary-${day}.md`);
  try {
    const { stdout } = await runGit(
      [
        "log",
        "--since=yesterday midnight",
        "--until=today midnight",
        "--pretty=format:- %s",
      ],
      scribeDir
    );
    fs.writeFileSync(summaryFile, `# Daily Summary (${day})\n\n${stdout}\n`);
    await commitAll(scribeDir, `Daily summary for ${day}`);
    outputChannel.appendLine(`📅 Generated daily summary: ${summaryFile}`);
  } catch (err: any) {
    outputChannel.appendLine("Daily summary error: " + err.message);
  }
}

async function generateWeeklySummary(
  scribeDir: string,
  day: string,
  outputChannel: vscode.OutputChannel
) {
  const summaryFile = path.join(scribeDir, `weekly-summary-${day}.md`);
  try {
    const { stdout } = await runGit(
      [
        "log",
        "--since=last sunday",
        "--until=this sunday",
        "--pretty=format:- %s",
      ],
      scribeDir
    );
    fs.writeFileSync(
      summaryFile,
      `# Weekly Summary (Week ending ${day})\n\n${stdout}\n`
    );
    await commitAll(scribeDir, `Weekly summary ending ${day}`);
    outputChannel.appendLine(`📆 Generated weekly summary: ${summaryFile}`);
  } catch (err: any) {
    outputChannel.appendLine("Weekly summary error: " + err.message);
  }
}

export function startScheduler(
  scribeDir: string,
  outputChannel: vscode.OutputChannel,
  storeIntervalId: (id: NodeJS.Timeout) => void
) {
  const intervalMin =
    vscode.workspace
      .getConfiguration()
      .get<number>("activityTracker.interval") ?? 30;
  const intervalMs = intervalMin * 60 * 1000;

  outputChannel.appendLine(
    `⏳ Scheduler started: logging every ${intervalMin} minutes.`
  );

  // Seed with "today"/current week so we don't fire a summary immediately
  // on every activation — only when the calendar day/week actually rolls over.
  let lastDaily = new Date().toISOString().slice(0, 10);
  let lastWeekly = getWeekKey(new Date());

  const intervalId = setInterval(async () => {
    try {
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const logFile = path.join(scribeDir, `log-${day}.md`);

      if (!fs.existsSync(scribeDir)) {
        fs.mkdirSync(scribeDir, { recursive: true });
      }

      const summary = `### ${now.toLocaleString()}\n\n${buildEditSummary()}`;
      fs.appendFileSync(logFile, summary);
      editHistory.clear();

      try {
        await commitAll(
          scribeDir,
          `Log at ${now.toISOString().replace(/[:.]/g, "-")}`
        );
        outputChannel.appendLine(`✅ Committed log to ${logFile}`);
      } catch (err: any) {
        outputChannel.appendLine("Commit error: " + err.message);
      }

      // Daily summary: once per calendar day, on the first tick after rollover.
      if (day !== lastDaily) {
        lastDaily = day;
        await generateDailySummary(scribeDir, day, outputChannel);
      }

      // Weekly summary: once per week, on the first Sunday tick after rollover.
      const weekKey = getWeekKey(now);
      if (now.getDay() === 0 && weekKey !== lastWeekly) {
        lastWeekly = weekKey;
        await generateWeeklySummary(scribeDir, day, outputChannel);
      }
    } catch (err: any) {
      outputChannel.appendLine("Scheduler error: " + err.message);
    }
  }, intervalMs);

  storeIntervalId(intervalId);
}
