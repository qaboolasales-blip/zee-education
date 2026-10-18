# Prompt 08 — Mobile App and School Connection

Use the Master Context and approved architecture. The existing mobile view is a UI preview, not yet a delivered native mobile app.

## First: choose strategy

Compare and recommend:

- responsive web + PWA first;
- React Native/Expo native app;
- hybrid wrapper only if justified.

Explain offline behavior, push notifications, app-store effort, shared code, shared-hosting constraints, updates, cost and the needs of teachers/parents. Do not choose without owner approval.

## Required mobile concepts

- One product app supports Parent, Student, Teacher and School Admin accounts.
- First launch supports secure QR scan **and** manual school domain/code entry.
- QR/code identifies a school installation only; it must not authenticate a user, grant a role or include permanent secrets.
- After school discovery, user signs in. Role is determined by server-side account assignment. If one account has multiple roles, show only assigned roles.
- Subsequent launches remember selected school safely and allow switching/revoking a school connection.

## Role workflows

- Parent: linked children, attendance, fees/receipts, published results, homework, notices, leave requests and approved manual PDF share.
- Student: own timetable, homework, attendance and published results.
- Teacher: own timetable, assigned-class attendance, homework and draft marks.
- School Admin: approved summaries, reviews, notices and school tasks.

## Requirements

- Use the same tenant isolation and RBAC APIs as web.
- Design network/loading/offline/error states; do not claim offline attendance or push notifications until implemented/tested.
- Securely store session tokens; never store DB credentials/tenant secrets in the app.
- Accessible touch targets, responsive layouts, Urdu RTL and selected school theme behavior.
- Define deep-link/QR token expiry, school change/logout and lost-device behavior.

Deliver technical recommendation, connection sequence diagram, role acceptance tests and phased implementation plan before building the app.
