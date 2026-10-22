# Curriculum & PDF Blockers — F-O-06 (Batch G)

Gaps Batch G found. None resolved by adding UI.

Evidence: `docs/curriculum-map.md`, `core/curriculum/**`. Reference UI 3/3
SHA-256 MATCH.

---

## GCB-01 — A destination must never be named in code

The locked UI contains a button labelled **`↗ Share result PDF on WhatsApp`**
(Mobile Preview, Parent Home) and its toast reads *"Manual WhatsApp PDF-share
preview"*.

V1 explicitly permits **manual, user-initiated** WhatsApp PDF sharing, and
explicitly excludes *automated* WhatsApp and *unofficial WhatsApp Web automation*.

**Why this is a blocker rather than an implementation detail.** The tempting
implementation is to have the code open a WhatsApp share URL on click. That would
still be "automated" in the sense the V1 exclusion targets, and it would make the
product dependent on an unofficial Web automation surface. The correct design is
that the **user** chooses the destination through the OS share sheet; code only
ever hands over a PDF the user asked for.

**What I did.** `validateShareRequest()` refuses **any** `destination` value —
including the literal string `whatsapp` — with reason `automation-forbidden`, and
requires `userInitiated === true`. `assertNoUnofficialAutomation()` scans the whole
`core/` tree for WhatsApp hosts/schemes, messaging providers, automation drivers and
any outbound absolute URL.

**Owner.** Confirm the intended UX is the OS share sheet, and that no direct
WhatsApp deep link is wanted.

---

## GCB-02 — Only four subject accents exist

**UI shows:** `.sl` cells coloured through `--c`, with four subjects
(Maths `#3b82f6`, Science `#10b981`, English `#8b5cf6`, Urdu `#f59e0b`) and the
per-cell pattern `MSEUM` / `SMUES` / `EUMSU`.

A real school will have more subjects. Each additional subject needs a colour, and
**adding a colour is a visual change** to a locked cell style.

**Why I did not add one.** The palette is locked and the pattern letters are locked.

**Owner.** Either confirm the four-subject set is the V1 model, or approve an
extended subject palette. Until then a subject outside the set is dropped rather
than rendered unstyled.

---

## GCB-03 — No approved copy for "no timetable" or "no notices"

`buildTimetable([])` returns a real empty state (`hasTimetable: false`), and
`classifyHomework({})` returns `known: false`. Both are **structure only** — no
sentence.

The approved references contain no approved string for a school with no timetable, no
homework, or no notices. Every visible state in the references is populated.

**Owner.** Approve empty-state copy for the Timetable grid, the Homework queue and
the Notices list.

---

## GCB-04 — PDF failure has one status channel and no retry affordance

`classifyPdfOutcome()` distinguishes `forbidden`, `not-found`, `rate-limited`,
`generation-failed`, `transport` and `empty-document` — and all six collapse to the
single existing `#toast`, which auto-hides after 2400 ms.

There is no approved failed-download surface, no retry control, and no partial-result
indication. A `429` is indistinguishable from a `500` to the user.

**Owner.** Approve a failure presentation and a retry affordance, or confirm a
transient toast is acceptable for V1.

---

## GCB-05 — No composer layouts for homework, notices or timetable entry

Three locked buttons exist whose behaviour is a preview toast:

- `＋ Homework`
- `＋ Timetable entry`
- `Create notice` (mobile)

No form layout exists for any of them. A composer is a new screen with new fields,
validation and error states.

**Owner.** Approve composer layouts, or confirm these remain previews and are
handled on a later batch.

---

## GCB-06 — No render or export endpoint

`▣ Print / PDF` and `⇩ Export Excel / CSV` have no endpoint and no template or
column/permission contract.

The reference already states the server must generate QR codes and templates. A
browser must **never** synthesise a document — that would put document generation,
and any data it embeds, on the client.

**KiloCode.** Publish the render contract (endpoint, template identifiers, media
type, failure semantics) and the export contract (columns, role permissions).

---

## GCB-07 — Notice expiry is uncontracted

`classifyNotice()` handles `expired` correctly, but the expiry window itself has no
server contract — so the server cannot filter expired notices either. A notice is
returned to every audience member and only the client flags it.

**Owner / KiloCode.** Decide whether expiry is a server-side filter or a client-side
indicator, and publish the semantics.

---

## GCB-08 — Timetable has no address, room model or teacher assignment

`timetable_slots` and `academic_weeks` do not exist, and neither do classes,
sections or teacher assignments (DSB-04 / FAT-07 / FAT-08). The mobile reference
shows a **room** per period (`Room 12`, `Lab 2`), which has no model at all.

So a timetable cannot be addressed, scoped, or room-assigned, and the Batch G exit
gate condition "timetable … function per role" cannot be met.

**KiloCode.** Academic structure, teacher assignment and rooms first.

---

## Summary

| ID | Blocker | Type | Owner |
|---|---|---|---|
| GCB-01 | A share destination must never be named in code | V1 boundary confirmation | Owner |
| GCB-02 | Only four subject accents exist | Locked palette vs real schools | Owner |
| GCB-03 | No approved copy for empty timetable/homework/notices | UI copy | Owner |
| GCB-04 | PDF failure has one transient channel, no retry affordance | UI | Owner |
| GCB-05 | No composer layouts for homework, notices, timetable entry | UI | Owner |
| GCB-06 | No render or export endpoint | Contract | KiloCode |
| GCB-07 | Notice expiry uncontracted | Contract | Owner + KiloCode |
| GCB-08 | No timetable address, room model or teacher assignment | Schema | KiloCode |

Standing from earlier batches: **BLK-01…BLK-09**, **CPB-01…CPB-09**,
**DSB-01…DSB-08**, **PEB-01…PEB-09**, **FAT-01…FAT-08**.

**Net effect for Batch G: zero UI elements added, and zero network paths other
than the relative-path API client.** G-O-02 and G-O-05 are complete and enforced:
navigation is provably immutable, and an unofficial WhatsApp/SMS/automation
integration cannot be added without the test suite failing.