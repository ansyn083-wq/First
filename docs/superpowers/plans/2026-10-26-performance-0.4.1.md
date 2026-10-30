# Import recovery and folder responsiveness fix

Evidence: folder-open awaits full-state persist before rendering; every classify snapshots/writes whole state twice; 43 imported notes can enqueue86 snapshots plus43 network calls; native two-thread pool runs both disk and slow API work. Pending batch adoption re-creates and saves already imported notes before ACK, with no busy guard.

- [ ] Reproduce folder waiting with deferred native save, repeated recovery ACK and repeated classification, and native local execution behind blocked network tasks.
- [ ] Local worker lane separate from network/file imports; coalesced JS writes and single concurrency classification queue; no durable transient classifying status.
- [ ] Immediate folder render with tiny separately persisted preferences; busy/progress and idempotent import recovery with durable receipt, no reclassification of existing records.
- [ ] Compact only duplicate imported attachment text that is fully preserved in linked note bodies; retain original binary and all note text.
- [ ] Full regression tests, review, signed0.4.1(versionCode5), persistent APK/source.

Limits: no remote access to tablet state. Screenshot proves43 notes and pending recovery, not exact timing or capacity failure. Do not claim measured device improvement.
