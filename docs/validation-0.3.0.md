# 研序 0.3.0

Requested: startup animation, collapsed saved configuration, account ID moved to settings, visual refinement, rename to 研序 selected by user.

Delivered: bounded local startup animation (~0.85 seconds; reduced-motion respected; independent 2.5 second fallback), API and BBDC details panels closed when saved, masked ID summary, explicit edit controls, progress and preference panels, updated name on launcher/UI/notification, refined lavender cards and navigation. Successful ID connection updates only its own card, preserving unrelated API inputs. Failure keeps the typed ID available. API key never read back. Original package and signing certificate retained.

Verification: 23 Node tests pass; all five browser suites pass (UI, race, 0.2 features, OCR race, 0.3 interface). New tests saw intended failures before implementation for ID relocation and stale preference summary, then passed after changes. Java UTF-8 size and XLSX reader tests pass. Internal screenshots inspected at phone/tablet dimensions with CJK font installed in test environment only. Fresh reviewer found no critical/important issue; minor preference summary issue corrected and regression tested.

APK 0.3 versionCode3 built and signature verified; signer SHA256 f299f0de0c881cdba5e8a88940471085dc28d471bcecaf4d8832d1d682435a52 matches previous versions. Previous APK hashes unchanged. No Android physical device or real user API/camera testing performed. Existing BBDC trial and backup attachment limits unchanged.
