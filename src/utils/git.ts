import * as fs from "fs";
import * as path from "path";
import { execFile, execFileSync } from "child_process";
import * as vscode from "vscode";

/**
 * Runs `git` with an argument array (never through a shell), so values like
 * branch names or commit hashes can't be interpreted as shell syntax.
 */
function execFileAsync(
  args: string[],
  options?: { cwd?: string }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile("git", args, options || {}, (err, stdout, stderr) => {
      if (err) {reject(err);}
      else {resolve({ stdout, stderr });}
    });
  });
}

// Serializes all git calls per process so concurrent scheduler/command
// invocations don't race on the same repo's index.lock.
let gitQueue: Promise<unknown> = Promise.resolve();

export function runGit(
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  const result = gitQueue.then(() => execFileAsync(args, { cwd }));
  gitQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

/**
 * Stages and commits everything in `cwd`. Silently no-ops if there is
 * nothing to commit instead of throwing.
 */
export async function commitAll(cwd: string, message: string): Promise<boolean> {
  await runGit(["add", "."], cwd);
  try {
    await runGit(["commit", "-m", message], cwd);
    return true;
  } catch (err: any) {
    const text = `${err.stdout ?? ""}${err.stderr ?? ""}${err.message ?? ""}`;
    if (/nothing to commit/i.test(text)) {
      return false;
    }
    throw err;
  }
}

/** Validates a string is safe to use as a git ref (branch name / commit-ish). */
export function isValidGitRef(ref: string): boolean {
  if (!ref || ref.length > 255) {return false;}
  if (ref.startsWith("-")) {return false;} // avoid being parsed as a flag
  if (/\s/.test(ref)) {return false;}
  if (/\.\.|[~^:?*[\\\]]/.test(ref)) {return false;}
  return /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(ref);
}

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
      execFileSync("git", ["init"], { cwd: dir });
      outputChannel.appendLine(`✅ Initialized new git repository in ${dir}`);

      // Optional: create an initial README or empty log
      const initialFile = path.join(dir, "README.md");
      if (!fs.existsSync(initialFile)) {
        fs.writeFileSync(initialFile, "# Scribe Logs\n\nInitial commit.\n");
        execFileSync("git", ["add", "."], { cwd: dir });
        execFileSync("git", ["commit", "-m", "Initial commit"], { cwd: dir });
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
