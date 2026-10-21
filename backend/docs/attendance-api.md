# Attendance API Contract (F-K-07)

## Fields
- attendance_date, student_id, status (present/absent/leave), source, recorded_by, remarks
- correction/audit: corrected_by, correction_reason, corrected_at
- Scope: class_id, section_id, academic_session_id

## Uniqueness (F-K-02)
One attendance record per (student_id, academic_session_id, attendance_date)

## Validation (F-K-03)
- Teacher-assignment scope validation - teachers can only record attendance for assigned classes/sections
- Role restrictions (Teacher, School Admin, Super Admin as appropriate)
- Server-side school connection enforced

## Operations (F-K-04)
- Create/update/correction with transactions
- Audit behavior on corrections
- Immutable audit trail for changes

## Views (F-K-05)
- Role-safe attendance views and summary queries
- Students/parents see only their own data
- Teachers see assigned scope
- Admins see authorized scope

## Testing (F-K-06)
- Duplicate prevention
- Date boundary validation
- Forbidden class access
- Correction history tracking
