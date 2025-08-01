// src/utils/commands.ts
import * as vscode from "vscode";
import { exec, execSync } from "child_process";
import { execPromise } from "./git";

export function registerCommands(
  context: vscode.ExtensionContext,
  scribeDir: string
) {
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
          {
            cwd: scribeDir,
          }
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
