<?php

namespace App\Libraries;

/**
 * Write operations against a school's OWN dedicated database.
 *
 * TENANT SAFETY (ADR-001 / ADR-003):
 *  - Every method requires a resolved school connection. There is no way to
 *    pass a database name from a browser.
 *  - Nothing here ever touches the control-plane tables.
 *  - Values are validated and bound as query parameters; no SQL string is
 *    built from request data.
 */
class SchoolRecordService
{
    private $conn;
    private ?int $schoolId;

    /** Signed-in user writing the row. Required by columns such as attendance.recorded_by. */
    private ?int $actorId;

    public function __construct($conn = null, ?int $schoolId = null, ?int $actorId = null)
    {
        $this->conn     = $conn;
        $this->schoolId = $schoolId;
        $this->actorId  = $actorId;
    }

    private function db()
    {
        if ($this->conn === null) {
            throw new \RuntimeException('No school database connection');
        }

        return $this->conn;
    }

    private function now(): string
    {
        return date('Y-m-d H:i:s');
    }

    private function clean(?string $v, int $max = 191): string
    {
        return trim(substr((string) $v, 0, $max));
    }

    /**
     * The school's current active academic session, or null when none exists.
     *
     * Every scoped row (attendance, invoices, notices, marks) carries a NOT NULL
     * FK to this table, so a write cannot be recorded before a session exists.
     * It is resolved from the school's own data - never taken from the request.
     *
     * @return int|null
     */
    private function currentSessionId($db)
    {
        $row = $db->table('academic_sessions')
            ->where('is_active', 1)
            ->orderBy('id', 'DESC')
            ->limit(1)
            ->get()
            ->getRow();

        if ($row === null) {
            return null;
        }

        return (int) $row->id;
    }

    /**
     * The class/section the student is currently enrolled in, or null.
     *
     * @return object|null
     */
    private function currentEnrollment($db, int $studentId)
    {
        return $db->table('enrollments')
            ->where('student_id', $studentId)
            ->whereIn('status', ['enrolled', 'promoted'])
            ->orderBy('id', 'DESC')
            ->limit(1)
            ->get()
            ->getRow();
    }

    /**
     * True when the string is a plain YYYY-MM-DD date.
     */
    private function isDate(string $value): bool
    {
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return false;
        }

        [$y, $m, $d] = array_map('intval', explode('-', $value));

        return checkdate($m, $d, $y);
    }

    /* ------------------------------------------------------------ STUDENTS */

    /**
     * @return array{ok:bool,message:string,id?:int}
     */
    public function createStudent(array $in): array
    {
        $first = $this->clean($in['first_name'] ?? '');
        $last  = $this->clean($in['last_name'] ?? '');
        $adm   = $this->clean($in['admission_number'] ?? '');

        if ($first === '') {
            return ['ok' => false, 'message' => 'First name is required'];
        }

        if ($adm === '') {
            return ['ok' => false, 'message' => 'Admission number is required'];
        }

        $db = $this->db();

        $exists = $db->table('students')
            ->where('admission_number', $adm)
            ->countAllResults();

        if ($exists > 0) {
            return ['ok' => false, 'message' => 'That admission number already exists'];
        }

        $gender = in_array($in['gender'] ?? '', ['male', 'female', 'other'], true)
            ? $in['gender']
            : null;

        $status = $in['status'] ?? 'active';
        $status = in_array($status, ['active', 'inactive', 'transferred', 'withdrawn', 'archived'], true)
            ? $status
            : 'active';

        $db->table('students')->insert([
            'first_name'       => $first,
            'last_name'        => $last,
            'admission_number' => $adm,
            'date_of_birth'    => $this->clean($in['date_of_birth'] ?? '', 10) ?: null,
            'gender'           => $gender,
            'status'           => $status,
            'created_at'       => $this->now(),
            'updated_at'       => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Student added', 'id' => (int) $db->insertID()];
    }

    /* ------------------------------------------------------------- STAFF */

    /**
     * @return array{ok:bool,message:string,id?:int}
     */
    public function createStaff(array $in): array
    {
        $first = $this->clean($in['first_name'] ?? '');
        $emp   = $this->clean($in['employee_id'] ?? '');
        $role  = $this->clean($in['role_type'] ?? '');

        if ($first === '') {
            return ['ok' => false, 'message' => 'First name is required'];
        }

        if ($emp === '') {
            return ['ok' => false, 'message' => 'Employee ID is required'];
        }

        if ($role === '') {
            return ['ok' => false, 'message' => 'Role type is required'];
        }

        $db = $this->db();

        if ($db->table('staff')->where('employee_id', $emp)->countAllResults() > 0) {
            return ['ok' => false, 'message' => 'That employee ID already exists'];
        }

        $db->table('staff')->insert([
            'first_name'  => $first,
            'last_name'   => $this->clean($in['last_name'] ?? ''),
            'employee_id' => $emp,
            'role_type'   => $role,
            'status'      => 'active',
            'created_at'  => $this->now(),
            'updated_at'  => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Staff member added', 'id' => (int) $db->insertID()];
    }

    /* --------------------------------------------------------- ATTENDANCE */

    /**
     * Mark attendance for one student on one date.
     *
     * @return array{ok:bool,message:string}
     */
    public function markAttendance(array $in): array
    {
        $studentId = (int) ($in['student_id'] ?? 0);
        $status    = $this->clean($in['status'] ?? '', 20);
        $date      = $this->clean($in['attendance_date'] ?? '', 10);

        if ($studentId <= 0) {
            return ['ok' => false, 'message' => 'A student is required'];
        }

        if (! in_array($status, ['present', 'absent', 'leave'], true)) {
            return ['ok' => false, 'message' => 'Status must be present, absent or leave'];
        }

        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $date = date('Y-m-d');
        }

        $db = $this->db();

        if ($db->table('students')->where('id', $studentId)->get()->getRow() === null) {
            return ['ok' => false, 'message' => 'Student not found'];
        }

        // Scope resolution. attendance.academic_session_id and .class_id are
        // NOT NULL FKs and .recorded_by is NOT NULL, so all three must be known
        // before a row can exist. Each is read from the school's own data.
        $sessionId = $this->currentSessionId($db);

        if ($sessionId === null) {
            return ['ok' => false, 'message' => 'No active academic session is configured for this school'];
        }

        $enrollment = $this->currentEnrollment($db, $studentId);

        if ($enrollment === null) {
            return ['ok' => false, 'message' => 'This student is not enrolled in a class'];
        }

        if ($this->actorId === null) {
            return ['ok' => false, 'message' => 'Cannot determine the signed-in user recording this attendance'];
        }

        $existing = $db->table('attendance')
            ->where('student_id', $studentId)
            ->where('academic_session_id', $sessionId)
            ->where('attendance_date', $date)
            ->get()
            ->getRow();

        if ($existing !== null) {
            $db->table('attendance')->where('id', $existing->id)->update([
                'status'     => $status,
                'updated_at' => $this->now(),
            ]);

            return ['ok' => true, 'message' => 'Attendance updated'];
        }

        $db->table('attendance')->insert([
            'student_id'          => $studentId,
            'academic_session_id' => $sessionId,
            'class_id'            => (int) $enrollment->class_id,
            'section_id'          => isset($enrollment->section_id) && $enrollment->section_id !== null
                ? (int) $enrollment->section_id
                : null,
            'attendance_date'     => $date,
            'status'              => $status,
            'source'              => $this->clean($in['source'] ?? '', 50) ?: 'manual',
            'recorded_by'         => $this->actorId,
            'remarks'             => ($r = $this->clean($in['remarks'] ?? '', 191)) !== '' ? $r : null,
            'created_at'          => $this->now(),
            'updated_at'          => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Attendance recorded'];
    }

    /* ---------------------------------------------------------------- FEES */

    /**
     * @return array{ok:bool,message:string,id?:int}
     */
    public function createFeeInvoice(array $in): array
    {
        $studentId = (int) ($in['student_id'] ?? 0);
        $head      = $this->clean($in['fee_head'] ?? '');
        $amount    = (int) ($in['amount'] ?? 0);

        if ($studentId <= 0) {
            return ['ok' => false, 'message' => 'A student is required'];
        }

        if ($head === '') {
            return ['ok' => false, 'message' => 'Fee head is required'];
        }

        if ($amount <= 0) {
            return ['ok' => false, 'message' => 'Amount must be greater than zero'];
        }

        $db = $this->db();

        if ($db->table('students')->where('id', $studentId)->get()->getRow() === null) {
            return ['ok' => false, 'message' => 'Student not found'];
        }

        // fee_invoices.academic_session_id and .due_date are both NOT NULL, so
        // neither can be left to the caller: the session is resolved from the
        // school's own data and the due date defaults to 30 days out.
        $sessionId = (int) ($in['academic_session_id'] ?? 0);

        if ($sessionId <= 0) {
            $sessionId = $this->currentSessionId($db);
        }

        if ($sessionId === null) {
            return ['ok' => false, 'message' => 'No active academic session is configured for this school'];
        }

        if ($db->table('academic_sessions')->where('id', $sessionId)->countAllResults() === 0) {
            return ['ok' => false, 'message' => 'Unknown academic session'];
        }

        $dueDate = $this->clean($in['due_date'] ?? '', 10);

        if (! $this->isDate($dueDate)) {
            $dueDate = date('Y-m-d', strtotime('+30 days'));
        }

        $db->table('fee_invoices')->insert([
            'academic_session_id' => $sessionId,
            'student_id'          => $studentId,
            'fee_head'            => $head,
            'amount'              => $amount,
            'due_date'            => $dueDate,
            'status'              => 'due',
            'created_at'          => $this->now(),
            'updated_at'          => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Invoice created', 'id' => (int) $db->insertID()];
    }

    /**
     * Record a manual receipt against an invoice. No online gateway.
     *
     * @return array{ok:bool,message:string,id?:int}
     */
    public function recordReceipt(array $in): array
    {
        $invoiceId = (int) ($in['invoice_id'] ?? 0);
        $amount    = (int) ($in['amount_paid'] ?? 0);
        $mode      = $this->clean($in['payment_mode'] ?? '');
        $ref       = $this->clean($in['reference'] ?? '');

        if ($invoiceId <= 0) {
            return ['ok' => false, 'message' => 'An invoice is required'];
        }

        if ($amount <= 0) {
            return ['ok' => false, 'message' => 'Amount must be greater than zero'];
        }

        if (! in_array($mode, ['cash', 'bank', 'cheque', 'wallet'], true)) {
            return ['ok' => false, 'message' => 'Payment mode must be cash, bank, cheque or wallet'];
        }

        $db = $this->db();

        $invoice = $db->table('fee_invoices')->where('id', $invoiceId)->get()->getRow();

        if ($invoice === null) {
            return ['ok' => false, 'message' => 'Invoice not found'];
        }

        $alreadyPaid = (float) ($db->table('fee_receipts')
            ->where('invoice_id', $invoiceId)
            ->selectSum('amount_paid', 't')
            ->get()
            ->getRow('t') ?? 0);

        if ($amount > ((float) $invoice->amount - $alreadyPaid)) {
            return ['ok' => false, 'message' => 'Amount is larger than the invoice'];
        }

        $db->table('fee_receipts')->insert([
            'invoice_id'    => $invoiceId,
            'receipt_number' => $this->nextReceiptNumber($db),
            'amount_paid'   => $amount,
            'payment_mode'  => $mode,
            'reference'     => $ref,
            'collector_id'  => $this->actorId ?? $this->schoolId,
            'paid_at'       => $this->now(),
            'created_at'    => $this->now(),
        ]);

        // fee_invoices.status is an ENUM of due/partial/paid/overdue: a part
        // payment is 'partial', only a fully settled invoice becomes 'paid'.
        $settled = ($alreadyPaid + $amount) >= (float) $invoice->amount;

        $db->table('fee_invoices')->where('id', $invoiceId)->update([
            'status'     => $settled ? 'paid' : 'partial',
            'updated_at' => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Receipt recorded'];
    }

    /**
     * A receipt number that is not yet used, so the unique key can never be
     * violated by a repeat count or a deleted row.
     */
    private function nextReceiptNumber($db): string
    {
        $base   = 'RC-' . date('ymd');
        $series = (int) $db->table('fee_receipts')
            ->like('receipt_number', $base, 'after')
            ->countAllResults();

        for ($i = 0; $i < 100; $i++) {
            $candidate = $base . '-' . str_pad((string) ($series + $i + 1), 4, '0', STR_PAD_LEFT);

            if ($db->table('fee_receipts')->where('receipt_number', $candidate)->countAllResults() === 0) {
                return $candidate;
            }
        }

        return $base . '-' . str_pad((string) (microtime(true) * 10000), 8, '0', STR_PAD_LEFT);
    }

    /* --------------------------------------------------------------- READ */

    /**
     * @return list<array<string, mixed>>
     */
    public function listStudents(int $limit = 200): array
    {
        return $this->db()->table('students')->orderBy('id', 'DESC')->get($limit)->getResultArray();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listInvoices(int $limit = 200): array
    {
        return $this->db()->table('fee_invoices')->orderBy('id', 'DESC')->get($limit)->getResultArray();
    }

    /* ------------------------------------------------------- SCHOOL SETTINGS */

    /**
     * Write the school's own settings.
     *
     * These live in the school's dedicated database (school_settings), so one
     * school's branding can never overwrite another's.
     *
     * @return array{ok:bool,message:string}
     */
    public function saveSettings(array $in): array
    {
        $db = $this->db();

        if (! $db->tableExists('school_settings')) {
            return ['ok' => false, 'message' => 'This installation has no settings table yet'];
        }

        $allowed = [
            'brand_primary'   => '/^#[0-9a-fA-F]{6}$/',
            'brand_secondary' => '/^#[0-9a-fA-F]{6}$/',
        ];

        $text = [
            'language' => ['en', 'roman-ur', 'ur'],
            'timezone' => null,
            'currency' => null,
        ];

        $now   = date('Y-m-d H:i:s');
        $saved = [];

        foreach ($allowed as $key => $pattern) {
            $value = $this->clean($in[$key] ?? '', 32);

            if ($value === '' || preg_match($pattern, $value) !== 1) {
                continue;
            }

            $saved[$key] = $value;
        }

        foreach ($text as $key => $allowedValues) {
            $value = $this->clean($in[$key] ?? '', 64);

            if ($value === '') {
                continue;
            }

            if ($allowedValues !== null && ! in_array($value, $allowedValues, true)) {
                continue;
            }

            if ($key === 'timezone' && ! in_array($value, timezone_identifiers_list(), true)) {
                continue;
            }

            $saved[$key] = $value;
        }

        if ($saved === []) {
            return ['ok' => false, 'message' => 'No valid setting was supplied'];
        }

        foreach ($saved as $key => $value) {
            $exists = $db->table('school_settings')->where('setting_key', $key)->countAllResults();

            if ($exists > 0) {
                $db->table('school_settings')->where('setting_key', $key)->update([
                    'setting_value' => $value,
                    'updated_at'    => $now,
                ]);

                continue;
            }

            $db->table('school_settings')->insert([
                'setting_key'   => $key,
                'setting_value' => $value,
                'created_at'    => $now,
                'updated_at'    => $now,
            ]);
        }

        return ['ok' => true, 'message' => 'Settings saved'];
    }

    /* ----------------------------------------------------- BATCH ATTENDANCE */

    /**
     * Record a whole register in one request.
     *
     * The per-student rules of markAttendance() still apply; this only saves
     * the round trip when a teacher submits a full class.
     *
     * @return array{ok:bool,message:string,saved?:int,failed?:int}
     */
    public function markAttendanceBatch(array $in): array
    {
        $entries = $in['entries'] ?? [];

        if (! is_array($entries) || $entries === []) {
            return ['ok' => false, 'message' => 'There is nothing to submit'];
        }

        $date     = $this->clean($in['attendance_date'] ?? '', 10);
        $saved    = 0;
        $failed   = 0;
        $lastFail = '';

        foreach ($entries as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            $result = $this->markAttendance([
                'student_id'      => $entry['student_id'] ?? 0,
                'status'          => $entry['status'] ?? '',
                'attendance_date' => $date,
                'source'          => $entry['source'] ?? 'register',
            ]);

            if ($result['ok'] === true) {
                $saved++;

                continue;
            }

            $failed++;
            $lastFail = (string) $result['message'];
        }

        if ($saved === 0) {
            return [
                'ok'      => false,
                'message' => $lastFail !== '' ? $lastFail : 'No register entry could be saved',
                'saved'   => 0,
                'failed'  => $failed,
            ];
        }

        return [
            'ok'      => true,
            'message' => 'Register submitted for ' . $saved . ' student' . ($saved === 1 ? '' : 's'),
            'saved'   => $saved,
            'failed'  => $failed,
        ];
    }

    /* -------------------------------------------------------------- MARKS */

    /**
     * Create an assessment in draft.
     *
     * @return array{ok:bool,message:string,id?:int}
     */
    public function createAssessment(array $in): array
    {
        $db = $this->db();

        $name   = $this->clean($in['exam_name'] ?? '');
        $max    = (float) ($in['max_marks'] ?? 0);
        $class  = (int) ($in['class_id'] ?? 0);
        $subject = (int) ($in['subject_id'] ?? 0);

        if ($name === '') {
            return ['ok' => false, 'message' => 'Assessment name is required'];
        }

        if ($max <= 0) {
            return ['ok' => false, 'message' => 'Maximum marks must be greater than zero'];
        }

        if ($class <= 0 || $subject <= 0) {
            return ['ok' => false, 'message' => 'A class and a subject are required'];
        }

        $sessionId = $this->currentSessionId($db);

        if ($sessionId === null) {
            return ['ok' => false, 'message' => 'No active academic session is configured for this school'];
        }

        $teacherId = $this->resolveTeacherId($db, $in);

        if ($teacherId === null) {
            return ['ok' => false, 'message' => 'No teacher is available to own this assessment'];
        }

        $weightage = $in['weightage'] ?? null;
        $weightage = ($weightage === null || $weightage === '') ? null : (float) $weightage;

        $db->table('assessments')->insert([
            'academic_session_id' => $sessionId,
            'class_id'            => $class,
            'section_id'          => ($section = (int) ($in['section_id'] ?? 0)) > 0 ? $section : null,
            'subject_id'          => $subject,
            'teacher_id'          => $teacherId,
            'exam_name'           => $name,
            'max_marks'           => $max,
            'weightage'           => $weightage,
            'status'              => 'draft',
            'created_at'          => $this->now(),
            'updated_at'          => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Assessment created', 'id' => (int) $db->insertID()];
    }

    /**
     * Save marks for an assessment.
     *
     * @return array{ok:bool,message:string,saved?:int}
     */
    public function saveMarks(array $in): array
    {
        $db = $this->db();

        $assessmentId = (int) ($in['assessment_id'] ?? 0);
        $entries      = $in['entries'] ?? [];

        if ($assessmentId <= 0) {
            return ['ok' => false, 'message' => 'An assessment is required'];
        }

        if (! is_array($entries) || $entries === []) {
            return ['ok' => false, 'message' => 'There are no marks to save'];
        }

        $assessment = $db->table('assessments')->where('id', $assessmentId)->get()->getRow();

        if ($assessment === null) {
            return ['ok' => false, 'message' => 'Assessment not found'];
        }

        $maxMarks = (float) $assessment->max_marks;
        $saved    = 0;

        foreach ($entries as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            $studentId = (int) ($entry['student_id'] ?? 0);

            if ($studentId <= 0) {
                continue;
            }

            $absent = (int) ($entry['is_absent'] ?? 0) === 1;
            $marks  = $absent ? null : (float) ($entry['marks_obtained'] ?? 0);

            if (! $absent && ($marks < 0 || $marks > $maxMarks)) {
                return [
                    'ok'      => false,
                    'message' => 'A mark is outside 0 to ' . $maxMarks,
                ];
            }

            $existing = $db->table('marks_entries')
                ->where('assessment_id', $assessmentId)
                ->where('student_id', $studentId)
                ->get()
                ->getRow();

            $payload = [
                'marks_obtained' => $marks,
                'is_absent'      => $absent ? 1 : 0,
                'remarks'        => ($remark = $this->clean($entry['remarks'] ?? '', 255)) !== '' ? $remark : null,
                'entry_status'   => 'draft',
                'updated_at'     => $this->now(),
            ];

            if ($existing === null) {
                $db->table('marks_entries')->insert($payload + [
                    'assessment_id' => $assessmentId,
                    'student_id'    => $studentId,
                    'created_at'    => $this->now(),
                ]);
            } else {
                $db->table('marks_entries')->where('id', $existing->id)->update($payload);
            }

            $saved++;
        }

        return ['ok' => true, 'message' => 'Marks saved for ' . $saved . ' student' . ($saved === 1 ? '' : 's'), 'saved' => $saved];
    }

    /**
     * Move an assessment along the draft -> submitted -> reviewed -> published
     * workflow, and carry its marks entries with it.
     *
     * @return array{ok:bool,message:string}
     */
    public function setAssessmentStatus(array $in): array
    {
        $db = $this->db();

        $assessmentId = (int) ($in['assessment_id'] ?? 0);
        $status       = $this->clean($in['status'] ?? '', 20);

        if ($assessmentId <= 0) {
            return ['ok' => false, 'message' => 'An assessment is required'];
        }

        if (! in_array($status, ['draft', 'submitted', 'reviewed', 'published'], true)) {
            return ['ok' => false, 'message' => 'That status is not part of the review workflow'];
        }

        // Publishing (and signing off a review) is a School Admin decision.
        // A teacher may only move their own draft forward to "submitted".
        if (in_array($status, ['reviewed', 'published'], true)
            && ! \App\Policies\RolePolicy::isSchoolAdmin(auth()->loggedIn() ? auth()->user() : null)) {
            return ['ok' => false, 'message' => 'Only a School Admin can ' . ($status === 'published' ? 'publish' : 'sign off') . ' an assessment'];
        }

        $assessment = $db->table('assessments')->where('id', $assessmentId)->get()->getRow();

        if ($assessment === null) {
            return ['ok' => false, 'message' => 'Assessment not found'];
        }

        $db->table('assessments')->where('id', $assessmentId)->update([
            'status'     => $status,
            'updated_at' => $this->now(),
        ]);

        $entryUpdate = ['entry_status' => $status, 'updated_at' => $this->now()];

        if ($status === 'published') {
            $entryUpdate['published_at'] = $this->now();
        }

        if ($status === 'reviewed') {
            $entryUpdate['reviewed_by'] = $this->actorId;
        }

        $db->table('marks_entries')->where('assessment_id', $assessmentId)->update($entryUpdate);

        $labels = [
            'draft'     => 'Assessment moved back to draft',
            'submitted' => 'Assessment sent for review',
            'reviewed'  => 'Assessment marked as reviewed',
            'published' => 'Assessment published',
        ];

        return ['ok' => true, 'message' => $labels[$status]];
    }

    /* ----------------------------------------------------------- HOMEWORK */

    /**
     * @return array{ok:bool,message:string,id?:int}
     */
    public function createHomework(array $in): array
    {
        $db = $this->db();

        $title = $this->clean($in['title'] ?? '');
        $class = (int) ($in['class_id'] ?? 0);
        $subj  = (int) ($in['subject_id'] ?? 0);
        $due   = $this->clean($in['due_date'] ?? '', 10);

        if ($title === '') {
            return ['ok' => false, 'message' => 'A title is required'];
        }

        if ($class <= 0 || $subj <= 0) {
            return ['ok' => false, 'message' => 'A class and a subject are required'];
        }

        if (! $this->isDate($due)) {
            $due = date('Y-m-d', strtotime('+7 days'));
        }

        $sessionId = $this->currentSessionId($db);

        if ($sessionId === null) {
            return ['ok' => false, 'message' => 'No active academic session is configured for this school'];
        }

        $teacherId = $this->resolveTeacherId($db, $in);

        if ($teacherId === null) {
            return ['ok' => false, 'message' => 'No teacher is available to own this homework'];
        }

        $db->table('homework')->insert([
            'academic_session_id' => $sessionId,
            'class_id'            => $class,
            'section_id'          => ($section = (int) ($in['section_id'] ?? 0)) > 0 ? $section : null,
            'subject_id'          => $subj,
            'teacher_id'          => $teacherId,
            'title'               => $title,
            'description'         => ($description = $this->clean($in['description'] ?? '', 2000)) !== '' ? $description : null,
            'due_date'            => $due,
            'has_attachment'      => 0,
            'created_at'          => $this->now(),
            'updated_at'          => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Homework added', 'id' => (int) $db->insertID()];
    }

    /* ---------------------------------------------------------- TIMETABLE */

    /**
     * @return array{ok:bool,message:string,id?:int}
     */
    public function createTimetableEntry(array $in): array
    {
        $db = $this->db();

        $class    = (int) ($in['class_id'] ?? 0);
        $subj     = (int) ($in['subject_id'] ?? 0);
        $day      = (int) ($in['day_of_week'] ?? 0);
        $start    = $this->clean($in['start_time'] ?? '', 8);
        $end      = $this->clean($in['end_time'] ?? '', 8);

        if ($class <= 0 || $subj <= 0) {
            return ['ok' => false, 'message' => 'A class and a subject are required'];
        }

        if ($day < 1 || $day > 7) {
            return ['ok' => false, 'message' => 'Day of week must be 1 (Monday) to 7 (Sunday)'];
        }

        if (preg_match('/^\d{2}:\d{2}$/', $start) !== 1 || preg_match('/^\d{2}:\d{2}$/', $end) !== 1) {
            return ['ok' => false, 'message' => 'Start and end time must be HH:MM'];
        }

        if ($end <= $start) {
            return ['ok' => false, 'message' => 'The period must end after it starts'];
        }

        $sessionId = $this->currentSessionId($db);

        if ($sessionId === null) {
            return ['ok' => false, 'message' => 'No active academic session is configured for this school'];
        }

        $teacherId = $this->resolveTeacherId($db, $in);

        if ($teacherId === null) {
            return ['ok' => false, 'message' => 'No teacher is available to own this period'];
        }

        $db->table('timetables')->insert([
            'academic_session_id' => $sessionId,
            'class_id'            => $class,
            'section_id'          => ($section = (int) ($in['section_id'] ?? 0)) > 0 ? $section : null,
            'subject_id'          => $subj,
            'teacher_id'          => $teacherId,
            'day_of_week'         => $day,
            'start_time'          => $start . ':00',
            'end_time'            => $end . ':00',
            'location'            => ($location = $this->clean($in['location'] ?? '', 100)) !== '' ? $location : null,
            'created_at'          => $this->now(),
            'updated_at'          => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Period added to the timetable', 'id' => (int) $db->insertID()];
    }

    /* ------------------------------------------------------------ NOTICES */

    /**
     * @return array{ok:bool,message:string,id?:int}
     */
    public function createNotice(array $in): array
    {
        $db = $this->db();

        $title   = $this->clean($in['title'] ?? '');
        $content = $this->clean($in['content'] ?? '', 5000);
        $audience = $this->clean($in['audience'] ?? 'all', 20);

        if ($title === '') {
            return ['ok' => false, 'message' => 'A title is required'];
        }

        if (! in_array($audience, ['all', 'students', 'parents', 'teachers', 'staff'], true)) {
            $audience = 'all';
        }

        $publish = $this->clean($in['publish_date'] ?? '', 19);

        if (preg_match('/^\d{4}-\d{2}-\d{2}/', $publish) !== 1) {
            $publish = $this->now();
        }

        $expiry = $this->clean($in['expiry_date'] ?? '', 19);

        if (preg_match('/^\d{4}-\d{2}-\d{2}/', $expiry) !== 1) {
            $expiry = null;
        }

        $db->table('notices')->insert([
            'title'        => $title,
            'content'      => $content !== '' ? $content : null,
            'audience'     => $audience,
            'class_id'     => ($class = (int) ($in['class_id'] ?? 0)) > 0 ? $class : null,
            'section_id'   => ($section = (int) ($in['section_id'] ?? 0)) > 0 ? $section : null,
            'published_by' => $this->actorId ?? 0,
            'publish_date' => $publish,
            'expiry_date'  => $expiry,
            'is_published' => (int) ($in['is_published'] ?? 1) === 1 ? 1 : 0,
            'created_at'   => $this->now(),
            'updated_at'   => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Notice created', 'id' => (int) $db->insertID()];
    }

    /* ------------------------------------------------------------ HELPERS */

    /**
     * The teacher who owns a piece of school work.
     *
     * The requested teacher is used when it is a real staff row. Otherwise the
     * signed-in user's own staff record is used, and failing that the first
     * active staff member. A record is never invented: when the school has no
     * staff at all the caller is told so.
     */
    private function resolveTeacherId($db, array $in): ?int
    {
        $requested = (int) ($in['teacher_id'] ?? 0);

        if ($requested > 0 && $db->table('staff')->where('id', $requested)->countAllResults() > 0) {
            return $requested;
        }

        if ($this->actorId !== null) {
            $own = $db->table('staff')->where('user_id', $this->actorId)->where('status', 'active')->get()->getRow();

            if ($own !== null) {
                return (int) $own->id;
            }
        }

        $first = $db->table('staff')->where('status', 'active')->orderBy('id', 'ASC')->limit(1)->get()->getRow();

        return $first === null ? null : (int) $first->id;
    }
}