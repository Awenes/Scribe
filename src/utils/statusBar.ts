// src/utils/statusBar.ts
import * as vscode from "vscode";

export function setupStatusBar(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  statusBarItem.text = "$(pencil) Scribe active";
  statusBarItem.tooltip = "Tracking activity logs";
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);
}
