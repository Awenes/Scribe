# Scribe

Scribe is a local-first developer activity tracker for VS Code. It quietly records workspace activity, turns that activity into readable progress logs, and versions each snapshot in a local Git repository.

The goal is simple: help developers recover context, understand how a session evolved, and create useful progress summaries without introducing another dashboard or sending source activity to a remote service.

## Why Scribe exists

Development work is rarely a clean sequence of finished tasks. A session includes experiments, reversals, small fixes, and decisions that are difficult to reconstruct later. Commit history captures some of that story, but only after the developer deliberately creates a commit.

Scribe creates a lightweight local record between those moments. It is designed to preserve context without interrupting flow.

## What it does

- Tracks file-edit activity within the current workspace
- Generates timestamped Markdown logs at configurable intervals
- Produces daily and weekly summaries
- Stores logs in a workspace-specific local Git repository
- Lets developers browse previous snapshots
- Compares the current state with an earlier snapshot
- Restores a selected snapshot after confirmation
- Creates an experimental branch from an earlier snapshot

Scribe stores workspace logs under:

```text
C:\Users\<your-name>\.scribe\<workspace-folder>
```

Your logs and snapshot history remain on your machine.

## Product and engineering decisions

### Local ownership

Activity data can reveal a great deal about a developer and their work. Scribe keeps its records local by default and uses Git as a transparent, inspectable history rather than introducing a proprietary storage layer.

### Low-interruption tracking

The extension runs in the background and summarizes activity instead of asking the developer to manually maintain a journal throughout the day.

### Workspace-aware histories

Each workspace receives an independent log history. Activity from unrelated projects is never mixed into a single timeline.

### Reversible exploration

Snapshot restore, diffing, and branch creation are exposed as deliberate commands. Operations that can change the workspace require an explicit choice from the developer.

## Example log

```markdown
### 2026-08-20 16:00

- Edited: /components/Header.tsx (3 times)
- Edited: /pages/index.tsx (1 time)
```

## Commands

| Command | Purpose |
| --- | --- |
| `Scribe: Restore Snapshot` | Restore the workspace to a selected snapshot |
| `Scribe: View Diff with Snapshot` | Compare current files with a previous snapshot |
| `Scribe: Create Branch from Snapshot` | Create a branch from an earlier point in the history |

## Getting started

1. Install Scribe in VS Code.
2. Open a project workspace.
3. Start working. Scribe will create and update the workspace log automatically.

If the extension does not activate after installation, reload the VS Code window.

## Development

```bash
npm install
npm run compile
```

Use the VS Code extension development host to run and debug the extension locally.

## Roadmap

- A visual activity dashboard
- More control over logging intervals and event categories
- Optional remote-repository synchronization
- Richer summaries that remain explainable and developer-controlled

## Related project

The product and documentation site lives in [Awenes/scribe_website](https://github.com/Awenes/scribe_website).

## License

Scribe is available under the [MIT License](./LICENSE).
