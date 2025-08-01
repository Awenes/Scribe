// src/utils/git.ts
import * as fs from "fs";
import { exec } from "child_process";
import * as vscode from "vscode";

export function initializeRepo(
  scribeDir: string,
  output: vscode.OutputChannel
) {
  if (!fs.existsSync(scribeDir)) {
    fs.mkdirSync(scribeDir, { recursive: true });
    exec("git init", { cwd: scribeDir }, (err) => {
      if (err) output.appendLine("Failed to init git repo: " + err.message);
      else output.appendLine("Initialized Git repo in .scribe");
    });
  }
}

export function execPromise(
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
