# Reports, Exports & Print Templates — Batch J

- Agent: Cline (QA/Security/Ops). Microtasks **J-C-01..J-C-04**. 2026-10-17.
- State check: **no** export/report/print-template subsystem exists in backend (Controllers=Health/Home/Setup). J-C-04 partially executed via real log scan.

## J-C-01 — Export field minimisation & cross-school denial — **BLOCKED (spec ready)**
- Cannot execute: no export path. Evidence needed: implemented export + auth + scope.
- Spec: EX-01 export returns only fields the screen needs (minimisation — no incidental PII/secret columns); EX-02 School A export contains only `TENANT-A-…`; EX-03 forged `school_id` export filter ignored; EX-04 Parent export only linked children; EX-05 export honours the same row-scope as the read path (no wider).

## J-C-02 — Direct URL download authorization & expiry — **BLOCKED (spec ready)**
- Cannot execute: no export/download URLs. Evidence needed: implemented export download.
- Spec: EX-06 export download requires auth; EX-07 guessed/direct export URL → **401/403/404**; EX-08 export links expire; EX-09 no directory listing of generated exports; EX-10 failed export response leaks no path/stack.

## J-C-03 — Custom-template Super Admin-only rule & no reprint double-charge — **BLOCKED (spec ready)**
- Cannot execute: no template/commercial logic. Evidence needed: implemented template module + commercial records.
- Spec: PT-01 only Super Admin creates/edits a **custom** (charged) template; PT-02 built-in print templates are free and usable by School Admin; PT-03 an approved reprint does not create a second design charge (commercial rule from `PROJECT_MEMORY.md`); PT-04 School Admin cannot self-assign a paid template.

## J-C-04 — Export logs for PII/secrets — **PARTIALLY EXECUTED (real)**
- **Executed:** scanned `backend/writable/logs/*.log` for `password|secret|token|api_key|DSN|mysql://|cnic|@student|guardian` → **NO matches** (real). Current logs carry no PII/secrets.
- **Blocked:** no export subsystem exists, so export-specific logs cannot be reviewed. Evidence needed: an implemented export path; then re-scan export logs/artifacts for PII + assert export contents are not logged.

## Status
- Executed now: J-C-04 (current backend logs clean of PII/secrets — real). Blocked: J-C-01/02/03 (no export/template implementation). Reference UI unchanged (3/3). Nothing unexecuted is claimed passing.
