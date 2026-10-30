# SDD ledger — plan: docs/superpowers/plans/2026-10-27-local-choices.md
Isolation: source copy0.9.1, baseline sibling0.9.0, no git repository.
Task1 complete: catalog241 entries from official sources, profiles/courses/routing stable IDs and backup first-open settings. Local-options tests red→green.
Task2 complete: local first-open prompts and defaults, searchable saved majors and exam courses, catalog/custom additions, SVG icons. All110 Node tests pass. Three DOM suites cover new and old flows.
Save concurrency additionally tested red→green: board-settings writes serialize and stale snapshots reject explicitly, storage failure rolls back.
Task3: independent whole-change review and final packaging in progress.

Independent review:4 Important,0 Critical/Minor. Fixed all with failing DOM regressions first, then green full suite.
- professional editor now uses shared serialized save helper with draft baseline; per-board field updates derive from latest state, so failed earlier writes cannot erase later choices.
- classification refresh protects both professional search fields' focus/caret.
- cross-major course creation persists chosen activeMajorId.
- dynamic board labels escaped in header and mobile nav.
Additional first-entry edge fixed red→green: direct English wordbook navigation prompts for English and has own settings entry.
Declined items: physical Android layout/keyboard, real network AI quality and upgrade are separately bounded; APK signature/upgrade checked locally, device/network not claimed tested. Official catalog data derived from linked primary sources; no promise of per-institution admission coverage.

Task3 complete:111 Node tests,3 DOM suites,5 targeted regressions,12 Java groups all passed. Version16/0.9.1 APK v2/v3 signatures and same upgrade certificate verified; all packaged assets equal source, ZIP integrity verified. No deferred issues.
