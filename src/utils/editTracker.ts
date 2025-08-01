// src/utils/editTracker.ts
import * as vscode from "vscode";

export const editHistory: Map<string, number> = new Map();

export function setupFileEventListeners() {
  vscode.workspace.onDidChangeTextDocument((e) => {
    const filePath = e.document.uri.fsPath;
    const current = editHistory.get(filePath) ?? 0;
    const changes = e.contentChanges.length;
    editHistory.set(filePath, current + changes);
  });

  vscode.workspace.onDidOpenTextDocument((doc) => {
    const filePath = doc.uri.fsPath;
    if (!editHistory.has(filePath)) {
      editHistory.set(filePath, 0);
    }
  });
}
