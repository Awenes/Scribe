# ✍️ Scribe - Developer Activity Tracker for VS Code

**Scribe** is a VS Code extension that helps developers **track their activity**, **auto-log changes**, and **generate workspace-aware summaries**. It operates behind the scenes to record edits, auto-commit logs to a local Git repo, and offer easy ways to **restore or diff snapshots**, making it an ideal companion for focused, accountable, and resilient coding sessions.

---

## 🔧 Features

### ✅ Core Functionality
- **File Edit Tracking**: Tracks how many times each file was edited per logging interval.
- **Auto Logging**: Periodically logs a summary of edits to a markdown file.
- **Git Integration**: Each log is committed to a Git repo for easy versioning.
- **Workspace-Aware Logging**: Logs are scoped to each workspace in:
  ```
  C:\Users\<your-name>\.scribe\<workspace-folder>
  ```

---

### 📆 Summaries
- **Daily Summary**: Auto-generated at the end of each day, summarizing all commits and changes.
- **Weekly Summary**: Compiled at the end of the week with a high-level overview.

---

### 🧠 Snapshot Restore & Diff
- **Browse Commit History**: Easily view previous snapshots.
- **Restore Snapshot**: Revert to any earlier commit after confirming safety.
- **View Diff**: Compare your current state with any previous snapshot.
- **Optional Branch Creation**: Create a new branch from any commit for experimentation.

---

## 📂 File Structure

```
src/
├── extension.ts             # Entry point
├── utils.ts                 # Shared helpers (e.g., edit history, file ops)
├── git.ts                   # Git-related logic (commit, restore, diff)
└── scheduler.ts             # Timers & summary scheduling
```

---

## ⚙️ Configuration

You can customize the logging interval via your `settings.json`:

```json
"activityTracker.interval": 1
```

This value is in **minutes**. Default is `1`.

---

## 🚀 Getting Started

1. Clone the repo
2. Run the extension in the VS Code Extension Development Host
3. Start coding — Scribe will auto-log your changes!

---

## 📁 Example Log Output

Inside:  
```
C:\Users\yourname\.scribe\MyProject\log-2025-07-30.md
```

```markdown
### 2025-07-30 16:00

- Edited: /components/Header.tsx (3 times)
- Edited: /pages/index.tsx (1 time)
```

---

## ⏱️ Commands

| Command | Description |
|--------|-------------|
| `Scribe: Hello World` | Test command |
| `Scribe: Restore Snapshot` | Restore to a previous commit |
| `Scribe: View Diff with Snapshot` | Show file diffs |
| `Scribe: Create Branch from Snapshot` | Create a new branch from any commit |

---

## 🧪 Future Improvements

- Live dashboard for tracked activity
- Cloud sync & analytics
- Slack/Discord reporting integrations

---

## 🙏 Credits

Created by [Precious Awe](https://github.com/your-username)  
Inspired by productivity, versioning, and personal developer accountability.

---

## 📜 License

MIT License
