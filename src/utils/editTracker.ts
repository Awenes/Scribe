// src/utils/editTracker.ts
import * as vscode from "vscode";

export const editHistory: Map<string, number> = new Map();

export function setupFileEventListeners(): vscode.Disposable[] {
  const changeListener = vscode.workspace.onDidChangeTextDocument((e) => {
    const filePath = e.document.uri.fsPath;
    const current = editHistory.get(filePath) ?? 0;
    const changes = e.contentChanges.length;
    editHistory.set(filePath, current + changes);
  });

  const openListener = vscode.workspace.onDidOpenTextDocument((doc) => {
    const filePath = doc.uri.fsPath;
    if (!editHistory.has(filePath)) {
      editHistory.set(filePath, 0);
    }
  });

  return [changeListener, openListener];
}

/** Renders a tracked absolute path as workspace-relative for logs, so logs
 * committed to disk don't leak the user's full home-directory path. */
export function toDisplayPath(filePath: string): string {
  return vscode.workspace.asRelativePath(filePath, false);
}

export function buildEditSummary(): string {
  if (editHistory.size === 0) {
    return "- No editor activity detected.\n\n";
  }
  let summary = "";
  editHistory.forEach((edits, filePath) => {
    summary += `- Edited: ${toDisplayPath(filePath)} (${edits} times)\n`;
  });
  return summary + "\n";
}
