# Communication API (Timetable, Homework, Notices)

## Timetable
- One slot per class/section/day/time. Collision rule: no two slots for the same class/section/day overlapping in time.
- Fields: academic_session_id, class_id, section_id, subject_id, teacher_id, day_of_week (1-7), start_time, end_time, location.

## Homework
- Fields: academic_session_id, class_id, section_id, subject_id, teacher_id, title, description, due_date, has_attachment, attachment_policy.
- Attachment policy: manual upload only; no auto-share.

## Notices
- audience: all|students|parents|teachers|staff. Optional class_id/section_id scoping.
- publish_date, expiry_date, is_published.

## Manual PDF sharing
- PDF generation is protected; share is user-initiated only. No unofficial WhatsApp automation API.
