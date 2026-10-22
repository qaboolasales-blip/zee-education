# Timetable, Homework, Notices & Manual PDF Sharing — Batch G

- Agent: Cline (QA/Security/Ops). Microtasks **G-C-01..G-C-04**. 2026-10-17.
- State check: **no** timetable/homework/notice/PDF subsystem exists (Controllers=Health/Home/Setup; Models/Libraries/Filters empty). G-C-04 verified by real code scan.

## G-C-01 — Timetable collision & teacher/class isolation — **BLOCKED (spec ready)**
- Cannot execute: no timetable schema/logic. Evidence needed: timetable schema + teacher assignment + auth.
- Spec: TT-01 two entries for the same class+period → collision rejected; TT-02 same teacher double-booked in one slot → rejected; TT-03 Teacher edits an unassigned class's slot → **403**; TT-04 School A reads/writes School B's timetable → **403/404**; TT-05 homework set for an unassigned subject → **403**.

## G-C-02 — Notices by audience & expiry — **BLOCKED (spec ready)**
- Cannot execute: no notice subsystem. Evidence needed: notice schema + audience model + auth.
- Spec: N-01 notice targeted to a class/role only reaches that audience; N-02 expired notice hidden from lists; N-03 School Admin publishes only within own school; N-04 Teacher publishes only to assigned scope; N-05 Parent/Student cannot publish; N-06 forged audience/school ignored (server-resolved).

## G-C-03 — PDF authorization & temp-file cleanup — **BLOCKED (spec ready)**
- Cannot execute: no PDF generation/authorization path. Evidence needed: implemented export/PDF.
- Spec: PDF-01 PDF download requires auth + row-level scope (mirrors export rules); PDF-02 direct/guessed PDF URL → **401/403/404**; PDF-03 temp files cleaned after request, never world-readable, never in web root; PDF-04 PDF for another school/child → **403/404**.

## G-C-04 — Only manual user-initiated share present (V1 exclusion) — **EXECUTED (real, PASS)**
- **Executed:** scanned `backend/app/**` and `frontend/core/**` for `whatsapp|twilio|sms|broadcast|business api|payment gateway|stripe|paypal`.
- **Result:** all 27 matches are **denylist / boundary-guard code and locked-UI copy**, not implementations. Specifically `frontend/core/share-boundary.js` enforces *"No WhatsApp or messaging endpoint may be called from code, ever"* with a denylist (`whatsapp-api`, `whatsapp-cloud-api`, `twilio`, `sms-gateway`, provider hosts/paths); `frontend/core/payment-boundary.js` `assertNoPaymentGateway()` rejects gateway/checkout surfaces. No automated WhatsApp/SMS API, no payment gateway, and no messaging endpoint is called anywhere.
- **Conclusion (real):** the V1 exclusion (manual, user-initiated WhatsApp PDF-share only; no SMS/payment/automated WhatsApp) holds and is actively enforced by OpenCode's boundary tests. The "Share result PDF on WhatsApp" string is approved locked reference copy for a manual share, not an API call.
- **Note:** `PROJECT_MEMORY.md` V1 exclusions preserved. This is a genuine green result for G-C-04.

## Status
- Executed now: G-C-04 (real scan — V1 exclusion holds). Blocked: G-C-01/02/03 (no timetable/notice/PDF implementation). Reference UI unchanged (3/3). Nothing unexecuted is claimed passing.
