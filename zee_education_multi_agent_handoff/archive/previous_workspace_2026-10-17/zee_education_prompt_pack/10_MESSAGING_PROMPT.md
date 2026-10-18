# Prompt 10 — Messaging and Integrations

Use the Master Context. Preserve V1 boundaries. Do not bypass external-platform policies or claim automation is free.

## V1 scope

- In-app notices/approved messages and notification center, subject to approved roles/auditing.
- User-initiated/manual sharing of an authorized PDF via the device’s WhatsApp share sheet where platform/browser supports it.
- Fee reminders and absence information can appear in-app as approved.

## Explicitly not V1

- Automated WhatsApp Business API bulk sending.
- Unofficial WhatsApp Web/QR automation or mass sending.
- SMS service.
- Online payment provider.

## Future-integration design

For future official WhatsApp API, SMS, email, push or payment work: consult current official docs/pricing/policies at that time; design explicit consent/opt-in, message templates, delivery/audit logs, rate limiting, unsubscribe/preference controls and provider-failure handling. Do not embed provider credentials in frontend code.

## Deliverables

- In-app messaging/notice data model and role matrix.
- Manual PDF-share UX for web/PWA/native environments, including unavailable-share fallback.
- Notification preference and audit design.
- Future integration interface/adapter design that does not activate or promise providers.
- Privacy/consent questions for owner approval.
- Tests for audience targeting, school isolation, message visibility and permission denial.
