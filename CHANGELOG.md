# Change Log

All notable changes to the "Scribe" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release

## [0.0.8]

- Added an extension icon

## [0.0.7]

- Fixed a shell command injection vulnerability in the Restore Snapshot / Show Diff commands
- Fixed daily/weekly summaries not generating reliably
- Fixed an event listener leak on deactivation
- Logs now record workspace-relative paths instead of absolute paths
- Changed extension activation to `onStartupFinished`
- Removed the unused "Hello from Scribe" command
- Fixed broken test/lint tooling and added CI