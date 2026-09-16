// src/utils/commands.ts
import * as vscode from "vscode";
import { runGit, isValidGitRef } from "./git";

export function registerCommands(
  context: vscode.ExtensionContext,
  scribeDir: string
) {
  context.subscriptions.push(
    vscode.commands.registerCommand("Scribe.restoreSnapshot", async () => {
      try {
        const { stdout: logOutput } = await runGit(
          ["log", "--pretty=format:%h %ad | %s", "--date=short"],
          scribeDir
        );

        const commits = logOutput
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => line.trim());

        if (commits.length === 0) {
          vscode.window.showInformationMessage("No snapshots found yet.");
          return;
        }

        const selectedCommit = await vscode.window.showQuickPick(commits, {
          placeHolder: "Select a snapshot to inspect",
        });
        if (!selectedCommit) {return;}

        const commitHash = selectedCommit.split(" ")[0];
        if (!isValidGitRef(commitHash)) {
          vscode.window.showErrorMessage("Invalid commit reference.");
          return;
        }

        const { stdout: diffOutput } = await runGit(
          ["show", "--stat", commitHash],
          scribeDir
        );

        const preview = await vscode.window.showInformationMessage(
          `Changes in ${commitHash}:\n\n${diffOutput}`,
          "Restore This Snapshot",
          "Create Branch From This"
        );

        if (preview === "Create Branch From This") {
          const branchName = await vscode.window.showInputBox({
            prompt: "Enter new branch name",
            validateInput: (value) =>
              isValidGitRef(value)
                ? null
                : "Branch name may only contain letters, numbers, '.', '_', '-', '/' and must not start with '-'.",
          });
          if (branchName) {
            await runGit(["branch", branchName, commitHash], scribeDir);
            vscode.window.showInformationMessage(
              `Branch '${branchName}' created from ${commitHash}`
            );
          }
        } else if (preview === "Restore This Snapshot") {
          await runGit(["checkout", commitHash], scribeDir);
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
      try {
        const { stdout } = await runGit(
          ["log", "--pretty=format:%h %s", "-n", "5"],
          scribeDir
        );

        const commits = stdout.trim().split("\n").filter(Boolean);
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
        if (!isValidGitRef(hash1) || !isValidGitRef(hash2)) {
          vscode.window.showErrorMessage("Invalid commit reference.");
          return;
        }

        const { stdout: diff } = await runGit(
          ["diff", hash2, hash1],
          scribeDir
        );

        const doc = await vscode.workspace.openTextDocument({
          content: diff,
          language: "diff",
        });
        vscode.window.showTextDocument(doc);
      } catch (err: any) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
      }
    })
  );
}
