<?php

namespace App\Libraries;

/**
 * Real school data for the school workspace.
 *
 * EVERY figure the School Dashboard and the Mobile surface show is read here
 * from the school's OWN dedicated database. Nothing is invented: when a table
 * does not exist, or holds no rows, the answer is zero / an empty list, never
 * a plausible-looking placeholder.
 *
 * TENANT SAFETY (ADR-001 / ADR-003):
 *  - The connection is the school resolved server-side from the session.
 *  - No method accepts a school id, a database name or any other tenant
 *    selector. There is nothing to inject a cross-tenant value into.
 *  - All values are read through bound query parameters.
 *
 * The service never throws for a missing table: a school whose provisioning
 * is still running must still render its (empty) dashboard rather than a 500.
 */
class SchoolInsightService
{
    /** @var \CodeIgniter\Database\ConnectionInterface|null */
    private $conn;

    private ?int $schoolId;

    private ?int $actorId;

    /** Cached active academic session id, resolved from the school's own data. */
    private ?int $sessionId = null;

    private bool $sessionResolved = false;

    public function __construct($conn = null, ?int $schoolId = null, ?int $actorId = null)
    {
        $this->conn     = $conn;
        $this->schoolId = $schoolId;
        $this->actorId  = $actorId;
    }

    /**
     * The school connection, or null when the school has none yet.
     */
    public function db()
    {
        return $this->conn;
    }

    public function hasConnection(): bool
    {
        return $this->conn !== null;
    }

    /**
     * True when a table exists in the school's own database.
     */
    public function has(string $table): bool
    {
        if ($this->conn === null) {
            return false;
        }

        try {
            return (bool) $this->conn->tableExists($table);
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Run a reader, swallowing the failure and returning $fallback.
     *
     * A half-migrated school must still render.
     *
     * @param callable():mixed $reader
     * @param mixed            $fallback
     */
    private function safe(callable $reader, mixed $fallback = null): mixed
    {
        if ($this->conn === null) {
            return $fallback;
        }

        try {
            return $reader();
        } catch (\Throwable $e) {
            log_message('error', 'SchoolInsightService: ' . $e->getMessage());

            return $fallback;
        }
    }

    /**
     * The school's active academic session, or null.
     */
    public function activeSessionId(): ?int
    {
        if ($this->sessionResolved) {
            return $this->sessionId;
        }

        $this->sessionResolved = true;
        $this->sessionId       = null;

        if (! $this->has('academic_sessions')) {
            return null;
        }

        $row = $this->safe(function () {
            return $this->conn->table('academic_sessions')
                ->where('is_active', 1)
                ->orderBy('id', 'DESC')
                ->limit(1)
                ->get()
                ->getRow();
        });

        if ($row !== null) {
            $this->sessionId = (int) $row->id;
        }

        return $this->sessionId;
    }

    /* ------------------------------------------------------------- PEOPLE */

    /**
     * Students with their current class and primary guardian.
     *
     * @return list<array<string, mixed>>
     */
    public function students(int $limit = 500): array
    {
        if (! $this->has('students')) {
            return [];
        }

        $rows = $this->safe(function () use ($limit) {
            $builder = $this->conn->table('students')
                ->select('students.id, students.first_name, students.last_name, students.admission_number, students.status, students.gender, students.date_of_birth, students.created_at')
                ->orderBy('students.id', 'DESC')
                ->limit($limit);

            if ($this->has('enrollments') && $this->has('classes')) {
                $builder->select('classes.name AS class_name, sections.name AS section_name', false)
                    ->join('enrollments', 'enrollments.student_id = students.id AND enrollments.status IN (\'enrolled\',\'promoted\')', 'left')
                    ->join('classes', 'classes.id = enrollments.class_id', 'left')
                    ->join('sections', 'sections.id = enrollments.section_id', 'left');
            }

            return $builder->get()->getResultArray();
        }, []);

        return $rows;
    }

    /**
     * The guardian linked to a student, preferring the primary link.
     *
     * @return array<string, mixed>
     */
    public function guardianFor(int $studentId): array
    {
        if (! $this->has('student_guardian') || ! $this->has('guardians')) {
            return [];
        }

        $row = $this->safe(function () use ($studentId) {
            return $this->conn->table('student_guardian')
                ->select('guardians.first_name, guardians.last_name, guardians.phone, guardians.email, guardians.relation')
                ->join('guardians', 'guardians.id = student_guardian.guardian_id', 'left')
                ->where('student_guardian.student_id', $studentId)
                ->orderBy('student_guardian.is_primary', 'DESC')
                ->orderBy('student_guardian.id', 'ASC')
                ->limit(1)
                ->get()
                ->getRow();
        });

        return $row === null ? [] : (array) $row;
    }

    /**
     * Staff members.
     *
     * @return list<array<string, mixed>>
     */
    public function staff(int $limit = 500): array
    {
        if (! $this->has('staff')) {
            return [];
        }

        return $this->safe(function () use ($limit) {
            return $this->conn->table('staff')
                ->select('id, first_name, last_name, employee_id, role_type, status, created_at')
                ->orderBy('id', 'DESC')
                ->limit($limit)
                ->get()
                ->getResultArray();
        }, []);
    }

    /* --------------------------------------------------------- ATTENDANCE */

    /**
     * The daily register: enrolled students with the status already recorded
     * for today (if any).
     *
     * @return list<array<string, mixed>>
     */
    public function register(?string $date = null): array
    {
        if (! $this->has('students')) {
            return [];
        }

        $date = $date ?? date('Y-m-d');

        $rows = $this->safe(function () use ($date) {
            $builder = $this->conn->table('students')
                ->select('students.id, students.first_name, students.last_name, students.admission_number, students.status')
                ->whereIn('students.status', ['active'])
                ->orderBy('students.first_name', 'ASC')
                ->orderBy('students.last_name', 'ASC');

            if ($this->has('enrollments') && $this->has('classes')) {
                $builder->select('classes.name AS class_name, sections.name AS section_name, enrollments.class_id, enrollments.section_id', false)
                    ->join('enrollments', 'enrollments.student_id = students.id AND enrollments.status IN (\'enrolled\',\'promoted\')', 'left')
                    ->join('classes', 'classes.id = enrollments.class_id', 'left')
                    ->join('sections', 'sections.id = enrollments.section_id', 'left');
            }

            if ($this->has('attendance')) {
                $builder->select('attendance.status AS today_status', false)
                    ->join('attendance', 'attendance.student_id = students.id AND attendance.attendance_date = ' . $this->conn->escape($date), 'left');
            }

            return $builder->get()->getResultArray();
        }, []);

        return $rows;
    }

    /**
     * Attendance percentage per day for the last N days.
     *
     * Each entry is [ 'label' => 'Mon', 'date' => 'YYYY-MM-DD', 'percent' => 87.5,
     * 'present' => 35, 'total' => 40 ]. A day with no rows is 0, not a guess.
     *
     * @return list<array<string, mixed>>
     */
    public function attendanceTrend(int $days = 7): array
    {
        if (! $this->has('attendance')) {
            return [];
        }

        $from = date('Y-m-d', strtotime('-' . ($days - 1) . ' days'));

        $rows = $this->safe(function () use ($from) {
            return $this->conn->table('attendance')
                ->select('attendance_date, status, COUNT(*) AS n', false)
                ->where('attendance_date >=', $from)
                ->groupBy(['attendance_date', 'status'])
                ->get()
                ->getResultArray();
        }, []);

        $byDay = [];

        foreach ($rows as $row) {
            $day = (string) $row['attendance_date'];

            $byDay[$day] ??= ['present' => 0, 'total' => 0];

            $byDay[$day]['total'] += (int) $row['n'];

            if ((string) $row['status'] === 'present') {
                $byDay[$day]['present'] += (int) $row['n'];
            }
        }

        $out = [];

        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime('-' . $i . ' days'));
            $stat = $byDay[$date] ?? ['present' => 0, 'total' => 0];

            $out[] = [
                'label'   => date('D', strtotime($date)),
                'date'    => $date,
                'present' => $stat['present'],
                'total'   => $stat['total'],
                'percent' => $stat['total'] > 0 ? round($stat['present'] * 100 / $stat['total'], 1) : 0.0,
            ];
        }

        return $out;
    }

    /**
     * Attendance today, as [ present, total, percent ].
     *
     * @return array{0:int,1:int,2:float}
     */
    public function attendanceToday(): array
    {
        $rows = $this->attendanceTrend(1);

        if ($rows === []) {
            return [0, 0, 0.0];
        }

        return [(int) $rows[0]['present'], (int) $rows[0]['total'], (float) $rows[0]['percent']];
    }

    /**
     * Classes ranked by this week's attendance.
     *
     * @return list<array<string, mixed>>
     */
    public function topClasses(int $limit = 5): array
    {
        if (! $this->has('attendance') || ! $this->has('classes')) {
            return [];
        }

        $from = date('Y-m-d', strtotime('-6 days'));

        $rows = $this->safe(function () use ($from) {
            return $this->conn->table('attendance')
                ->select('attendance.class_id, classes.name AS class_name, attendance.status, COUNT(*) AS n', false)
                ->join('classes', 'classes.id = attendance.class_id', 'left')
                ->where('attendance.attendance_date >=', $from)
                ->groupBy(['attendance.class_id', 'classes.name', 'attendance.status'])
                ->get()
                ->getResultArray();
        }, []);

        $totals = [];

        foreach ($rows as $row) {
            $id = (int) ($row['class_id'] ?? 0);
            $key = $id . '|' . (string) ($row['class_name'] ?? '—');

            $totals[$key] ??= ['class_id' => $id, 'class_name' => (string) ($row['class_name'] ?? '—'), 'present' => 0, 'total' => 0];

            $totals[$key]['total'] += (int) $row['n'];

            if ((string) $row['status'] === 'present') {
                $totals[$key]['present'] += (int) $row['n'];
            }
        }

        $out = [];

        foreach ($totals as $row) {
            $row['percent'] = $row['total'] > 0 ? round($row['present'] * 100 / $row['total'], 1) : 0.0;

            $out[] = $row;
        }

        usort($out, static fn ($a, $b) => $b['percent'] <=> $a['percent']);

        return array_slice($out, 0, $limit);
    }

    /**
     * Number of students per class.
     *
     * @return list<array<string, mixed>>
     */
    public function gradeDistribution(): array
    {
        if (! $this->has('enrollments') || ! $this->has('classes')) {
            return [];
        }

        $rows = $this->safe(function () {
            return $this->conn->table('enrollments')
                ->select('enrollments.class_id, classes.name AS class_name, COUNT(DISTINCT enrollments.student_id) AS n', false)
                ->join('classes', 'classes.id = enrollments.class_id', 'left')
                ->whereIn('enrollments.status', ['enrolled', 'promoted'])
                ->groupBy(['enrollments.class_id', 'classes.name'])
                ->orderBy('classes.numeric_code', 'ASC')
                ->get()
                ->getResultArray();
        }, []);

        $out = [];

        foreach ($rows as $row) {
            $out[] = [
                'class_id'   => (int) ($row['class_id'] ?? 0),
                'class_name' => (string) ($row['class_name'] ?? '—'),
                'students'   => (int) ($row['n'] ?? 0),
            ];
        }

        return $out;
    }

    /* ---------------------------------------------------------------- FEES */

    /**
     * Fee invoices with the student name and the amount settled.
     *
     * @return list<array<string, mixed>>
     */
    public function invoices(int $limit = 300): array
    {
        if (! $this->has('fee_invoices')) {
            return [];
        }

        $rows = $this->safe(function () use ($limit) {
            $builder = $this->conn->table('fee_invoices')
                ->select('fee_invoices.id, fee_invoices.student_id, fee_invoices.fee_head, fee_invoices.amount, fee_invoices.due_date, fee_invoices.status, fee_invoices.created_at')
                ->orderBy('fee_invoices.id', 'DESC')
                ->limit($limit);

            if ($this->has('students')) {
                $builder->select('students.first_name, students.last_name, students.admission_number', false)
                    ->join('students', 'students.id = fee_invoices.student_id', 'left');
            }

            return $builder->get()->getResultArray();
        }, []);

        // The settled amount is aggregated separately and merged in PHP. A
        // grouped join would have to group by every selected column, which
        // breaks under ONLY_FULL_GROUP_BY.
        $paid = [];

        if ($this->has('fee_receipts')) {
            $sums = $this->safe(function () {
                return $this->conn->table('fee_receipts')
                    ->select('invoice_id, SUM(amount_paid) AS paid_total', false)
                    ->groupBy('invoice_id')
                    ->get()
                    ->getResultArray();
            }, []);

            foreach ($sums as $sum) {
                $paid[(int) $sum['invoice_id']] = (float) $sum['paid_total'];
            }
        }

        foreach ($rows as $index => $row) {
            $rows[$index]['paid_total'] = $paid[(int) ($row['id'] ?? 0)] ?? 0.0;
        }

        return $rows;
    }

    /**
     * Manual receipts.
     *
     * @return list<array<string, mixed>>
     */
    public function receipts(int $limit = 300): array
    {
        if (! $this->has('fee_receipts')) {
            return [];
        }

        return $this->safe(function () use ($limit) {
            $builder = $this->conn->table('fee_receipts')
                ->select('fee_receipts.id, fee_receipts.invoice_id, fee_receipts.receipt_number, fee_receipts.amount_paid, fee_receipts.payment_mode, fee_receipts.reference, fee_receipts.paid_at')
                ->orderBy('fee_receipts.id', 'DESC')
                ->limit($limit);

            if ($this->has('fee_invoices') && $this->has('students')) {
                $builder->select('fee_invoices.fee_head, students.first_name, students.last_name, students.admission_number', false)
                    ->join('fee_invoices', 'fee_invoices.id = fee_receipts.invoice_id', 'left')
                    ->join('students', 'students.id = fee_invoices.student_id', 'left');
            }

            return $builder->get()->getResultArray();
        }, []);
    }

    /**
     * Collected amount per month for the last N months.
     *
     * @return list<array<string, mixed>>
     */
    public function feeTrend(int $months = 6): array
    {
        $out = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $start = date('Y-m-01', strtotime('-' . $i . ' months'));
            $end   = date('Y-m-t 23:59:59', strtotime($start));

            $out[] = [
                'label' => date('M', strtotime($start)),
                'from'  => $start,
                'to'    => $end,
                'total' => $this->collectedBetween($start, $end),
            ];
        }

        return $out;
    }

    /**
     * Total collected between two datetimes.
     */
    public function collectedBetween(string $from, string $to): float
    {
        if (! $this->has('fee_receipts')) {
            return 0.0;
        }

        $sum = $this->safe(function () use ($from, $to) {
            return $this->conn->table('fee_receipts')
                ->selectSum('amount_paid', 't')
                ->where('paid_at >=', $from)
                ->where('paid_at <=', $to)
                ->get()
                ->getRow('t');
        }, 0);

        return (float) ($sum ?? 0);
    }

    /**
     * Fee totals: [ collected, outstanding, dueCountLabel, dueCount ].
     *
     * @return list<string>
     */
    public function feeTotals(): array
    {
        if (! $this->has('fee_invoices')) {
            return ['PKR 0', 'PKR 0', 'no invoices', '0'];
        }

        $billed = (float) ($this->safe(function () {
            return $this->conn->table('fee_invoices')->selectSum('amount', 't')->get()->getRow('t');
        }, 0) ?? 0);

        $paid = $this->collectedBetween('1970-01-01', '2999-12-31 23:59:59');

        $due = (int) ($this->safe(function () {
            return $this->conn->table('fee_invoices')->where('status !=', 'paid')->countAllResults();
        }, 0) ?? 0);

        return [
            'PKR ' . number_format($paid),
            'PKR ' . number_format(max(0, $billed - $paid)),
            $due . ' invoices pending',
            (string) $due,
        ];
    }

    /* -------------------------------------------------------------- MARKS */

    /**
     * Assessments with their class, subject and status.
     *
     * @return list<array<string, mixed>>
     */
    public function assessments(int $limit = 100): array
    {
        if (! $this->has('assessments')) {
            return [];
        }

        return $this->safe(function () use ($limit) {
            $builder = $this->conn->table('assessments')
                ->select('assessments.id, assessments.exam_name, assessments.max_marks, assessments.status, assessments.created_at, assessments.class_id, assessments.section_id, assessments.subject_id')
                ->orderBy('assessments.id', 'DESC')
                ->limit($limit);

            if ($this->has('classes')) {
                $builder->select('classes.name AS class_name', false)
                    ->join('classes', 'classes.id = assessments.class_id', 'left');
            }

            if ($this->has('sections')) {
                $builder->select('sections.name AS section_name', false)
                    ->join('sections', 'sections.id = assessments.section_id', 'left');
            }

            if ($this->has('subjects')) {
                $builder->select('subjects.name AS subject_name', false)
                    ->join('subjects', 'subjects.id = assessments.subject_id', 'left');
            }

            return $builder->get()->getResultArray();
        }, []);
    }

    /**
     * Mark entries for an assessment, with the student name.
     *
     * @return list<array<string, mixed>>
     */
    public function marks(?int $assessmentId = null, int $limit = 500): array
    {
        if (! $this->has('marks_entries')) {
            return [];
        }

        return $this->safe(function () use ($assessmentId, $limit) {
            $builder = $this->conn->table('marks_entries')
                ->select('marks_entries.id, marks_entries.assessment_id, marks_entries.student_id, marks_entries.marks_obtained, marks_entries.is_absent, marks_entries.remarks, marks_entries.entry_status')
                ->orderBy('marks_entries.id', 'ASC')
                ->limit($limit);

            if ($assessmentId !== null) {
                $builder->where('marks_entries.assessment_id', $assessmentId);
            }

            if ($this->has('students')) {
                $builder->select('students.first_name, students.last_name, students.admission_number', false)
                    ->join('students', 'students.id = marks_entries.student_id', 'left');
            }

            if ($this->has('assessments')) {
                $builder->select('assessments.exam_name, assessments.max_marks, assessments.status AS assessment_status', false)
                    ->join('assessments', 'assessments.id = marks_entries.assessment_id', 'left');
            }

            return $builder->get()->getResultArray();
        }, []);
    }

    /* ------------------------------------------- TIMETABLE / HOMEWORK */

    /**
     * Timetable entries.
     *
     * @return list<array<string, mixed>>
     */
    public function timetable(int $limit = 300): array
    {
        if (! $this->has('timetables')) {
            return [];
        }

        return $this->safe(function () use ($limit) {
            $builder = $this->conn->table('timetables')
                ->select('timetables.id, timetables.day_of_week, timetables.start_time, timetables.end_time, timetables.location, timetables.class_id, timetables.section_id, timetables.subject_id, timetables.teacher_id')
                ->orderBy('timetables.day_of_week', 'ASC')
                ->orderBy('timetables.start_time', 'ASC')
                ->limit($limit);

            if ($this->has('classes')) {
                $builder->select('classes.name AS class_name', false)
                    ->join('classes', 'classes.id = timetables.class_id', 'left');
            }

            if ($this->has('sections')) {
                $builder->select('sections.name AS section_name', false)
                    ->join('sections', 'sections.id = timetables.section_id', 'left');
            }

            if ($this->has('subjects')) {
                $builder->select('subjects.name AS subject_name', false)
                    ->join('subjects', 'subjects.id = timetables.subject_id', 'left');
            }

            if ($this->has('staff')) {
                $builder->select('staff.first_name AS teacher_first_name, staff.last_name AS teacher_last_name', false)
                    ->join('staff', 'staff.id = timetables.teacher_id', 'left');
            }

            return $builder->get()->getResultArray();
        }, []);
    }

    /**
     * Homework with its class, subject and due date.
     *
     * @return list<array<string, mixed>>
     */
    public function homework(int $limit = 200): array
    {
        if (! $this->has('homework')) {
            return [];
        }

        return $this->safe(function () use ($limit) {
            $builder = $this->conn->table('homework')
                ->select('homework.id, homework.title, homework.description, homework.due_date, homework.class_id, homework.section_id, homework.subject_id, homework.created_at')
                ->orderBy('homework.due_date', 'ASC')
                ->limit($limit);

            if ($this->has('classes')) {
                $builder->select('classes.name AS class_name', false)
                    ->join('classes', 'classes.id = homework.class_id', 'left');
            }

            if ($this->has('sections')) {
                $builder->select('sections.name AS section_name', false)
                    ->join('sections', 'sections.id = homework.section_id', 'left');
            }

            if ($this->has('subjects')) {
                $builder->select('subjects.name AS subject_name', false)
                    ->join('subjects', 'subjects.id = homework.subject_id', 'left');
            }

            return $builder->get()->getResultArray();
        }, []);
    }

    /**
     * Published and unpublished notices.
     *
     * @return list<array<string, mixed>>
     */
    public function notices(int $limit = 100): array
    {
        if (! $this->has('notices')) {
            return [];
        }

        return $this->safe(function () use ($limit) {
            $builder = $this->conn->table('notices')
                ->select('id, title, content, audience, publish_date, expiry_date, is_published, created_at')
                ->orderBy('publish_date', 'DESC')
                ->orderBy('id', 'DESC')
                ->limit($limit);

            if ($this->has('classes')) {
                $builder->select('classes.name AS class_name', false)
                    ->join('classes', 'classes.id = notices.class_id', 'left');
            }

            return $builder->get()->getResultArray();
        }, []);
    }

    /* --------------------------------------------------------- ACTIVITY */

    /**
     * The recent-activity feed, built from the school's own records.
     *
     * Each entry is [ icon, title, detail, when, colour ].
     *
     * @return list<array<string, string>>
     */
    public function activity(int $limit = 6): array
    {
        $events = [];

        foreach ($this->students(50) as $s) {
            $events[] = [
                'sort'  => (string) ($s['created_at'] ?? ''),
                'icon'  => '♙',
                'title' => 'Enrolment: ' . $this->fullName($s),
                'detail' => 'Admission ' . (string) ($s['admission_number'] ?? '—'),
                'when'  => $this->since((string) ($s['created_at'] ?? '')),
                'colour' => '#3b82f6',
            ];
        }

        foreach ($this->receipts(50) as $r) {
            $events[] = [
                'sort'  => (string) ($r['paid_at'] ?? ''),
                'icon'  => '₨',
                'title' => 'Receipt ' . (string) ($r['receipt_number'] ?? ''),
                'detail' => 'PKR ' . number_format((float) ($r['amount_paid'] ?? 0)) . ' · ' . (string) ($r['payment_mode'] ?? 'cash'),
                'when'  => $this->since((string) ($r['paid_at'] ?? '')),
                'colour' => '#10b981',
            ];
        }

        foreach ($this->notices(50) as $n) {
            $events[] = [
                'sort'  => (string) ($n['publish_date'] ?? $n['created_at'] ?? ''),
                'icon'  => '▣',
                'title' => 'Notice: ' . (string) ($n['title'] ?? ''),
                'detail' => (int) ($n['is_published'] ?? 0) === 1 ? 'Published' : 'Draft',
                'when'  => $this->since((string) ($n['publish_date'] ?? $n['created_at'] ?? '')),
                'colour' => '#ec4899',
            ];
        }

        foreach ($this->homework(50) as $h) {
            $events[] = [
                'sort'  => (string) ($h['created_at'] ?? ''),
                'icon'  => '✎',
                'title' => 'Homework: ' . (string) ($h['title'] ?? ''),
                'detail' => 'Due ' . $this->prettyDate((string) ($h['due_date'] ?? '')),
                'when'  => $this->since((string) ($h['created_at'] ?? '')),
                'colour' => '#8b5cf6',
            ];
        }

        usort($events, static fn ($a, $b) => strcmp((string) $b['sort'], (string) $a['sort']));

        $out = [];

        foreach (array_slice($events, 0, $limit) as $e) {
            $out[] = [$e['icon'], $e['title'], $e['detail'], $e['when'], $e['colour']];
        }

        return $out;
    }

    /* --------------------------------------------------------- CALENDAR */

    /**
     * The current month's days and the school's real events.
     *
     * @return array{days:list<int>,month:string,monthIndex:int,year:int,events:list<array<string,string>>}
     */
    public function calendar(): array
    {
        $year  = (int) date('Y');
        $month = (int) date('n');

        $days = (int) date('t');

        $events = [];

        foreach ($this->notices(50) as $n) {
            $date = substr((string) ($n['publish_date'] ?? ''), 0, 10);

            if ($date !== '') {
                $events[] = ['date' => $date, 'title' => (string) ($n['title'] ?? ''), 'kind' => 'Notice', 'colour' => '#3b82f6'];
            }
        }

        foreach ($this->homework(50) as $h) {
            $date = substr((string) ($h['due_date'] ?? ''), 0, 10);

            if ($date !== '') {
                $events[] = ['date' => $date, 'title' => (string) ($h['title'] ?? ''), 'kind' => 'Homework due', 'colour' => '#10b981'];
            }
        }

        foreach ($this->invoices(50) as $i) {
            $date = substr((string) ($i['due_date'] ?? ''), 0, 10);

            if ($date !== '') {
                $events[] = ['date' => $date, 'title' => (string) ($i['fee_head'] ?? 'Fee'), 'kind' => 'Fee due', 'colour' => '#f59e0b'];
            }
        }

        usort($events, static fn ($a, $b) => strcmp((string) $a['date'], (string) $b['date']));

        return [
            'days'      => range(1, $days),
            'month'     => date('F'),
            'monthIndex' => (int) date('n'),
            'year'      => $year,
            'events'    => $events,
        ];
    }

    /* --------------------------------------------------------- SETTINGS */

    /**
     * The school's own settings, with the documented defaults applied when a
     * key has never been written.
     *
     * @return array<string, string>
     */
    public function settings(): array
    {
        $defaults = [
            'brand_primary'           => '#2563eb',
            'brand_secondary'         => '#1e3a8a',
            'language'                => 'en',
            'timezone'                => 'Asia/Karachi',
            'currency'                => 'PKR',
            'attendance_target_percent' => '90',
        ];

        if (! $this->has('school_settings')) {
            return $defaults;
        }

        $rows = $this->safe(function () {
            return $this->conn->table('school_settings')
                ->select('setting_key, setting_value')
                ->get()
                ->getResultArray();
        }, []);

        foreach ($rows as $row) {
            $key = (string) ($row['setting_key'] ?? '');

            if ($key !== '') {
                $defaults[$key] = (string) ($row['setting_value'] ?? '');
            }
        }

        return $defaults;
    }

    /**
     * Write a setting. Returns false when the table is missing.
     */
    public function saveSetting(string $key, string $value): bool
    {
        if ($key === '' || ! $this->has('school_settings')) {
            return false;
        }

        $now = date('Y-m-d H:i:s');

        $exists = $this->safe(function () use ($key) {
            return $this->conn->table('school_settings')->where('setting_key', $key)->countAllResults();
        }, 0);

        if ($exists > 0) {
            $this->safe(function () use ($key, $value, $now) {
                $this->conn->table('school_settings')
                    ->where('setting_key', $key)
                    ->update(['setting_value' => $value, 'updated_at' => $now]);
            });

            return true;
        }

        $this->safe(function () use ($key, $value, $now) {
            $this->conn->table('school_settings')->insert([
                'setting_key'   => $key,
                'setting_value' => $value,
                'created_at'    => $now,
                'updated_at'    => $now,
            ]);
        });

        return true;
    }

    /* ---------------------------------------------------------- OPTIONS */

    /**
     * The pick-lists the school workspace needs: classes, sections, subjects,
     * teachers and academic sessions.
     *
     * @return array<string, list<array<string, mixed>>>
     */
    public function options(): array
    {
        $out = [
            'classes'   => [],
            'sections'  => [],
            'subjects'  => [],
            'teachers'  => [],
            'sessions'  => [],
        ];

        if ($this->has('classes')) {
            $out['classes'] = $this->safe(function () {
                return $this->conn->table('classes')
                    ->select('id, name, numeric_code')
                    ->where('is_active', 1)
                    ->orderBy('numeric_code', 'ASC')
                    ->orderBy('name', 'ASC')
                    ->get()
                    ->getResultArray();
            }, []);
        }

        if ($this->has('sections')) {
            $out['sections'] = $this->safe(function () {
                return $this->conn->table('sections')
                    ->select('id, class_id, name')
                    ->where('is_active', 1)
                    ->orderBy('name', 'ASC')
                    ->get()
                    ->getResultArray();
            }, []);
        }

        if ($this->has('subjects')) {
            $out['subjects'] = $this->safe(function () {
                return $this->conn->table('subjects')
                    ->select('id, name, code')
                    ->where('is_active', 1)
                    ->orderBy('name', 'ASC')
                    ->get()
                    ->getResultArray();
            }, []);
        }

        if ($this->has('staff')) {
            $out['teachers'] = $this->safe(function () {
                return $this->conn->table('staff')
                    ->select('id, first_name, last_name, role_type, employee_id')
                    ->where('status', 'active')
                    ->orderBy('first_name', 'ASC')
                    ->get()
                    ->getResultArray();
            }, []);
        }

        if ($this->has('academic_sessions')) {
            $out['sessions'] = $this->safe(function () {
                return $this->conn->table('academic_sessions')
                    ->select('id, name, start_date, end_date, is_active')
                    ->orderBy('id', 'DESC')
                    ->get()
                    ->getResultArray();
            }, []);
        }

        return $out;
    }

    /**
     * Print templates stored for this school.
     *
     * @return list<array<string, mixed>>
     */
    public function printTemplates(int $limit = 50): array
    {
        if (! $this->has('print_templates')) {
            return [];
        }

        return $this->safe(function () use ($limit) {
            return $this->conn->table('print_templates')
                ->select('id, template_name, is_custom, design_charge_paid, reprint_count, created_at')
                ->orderBy('id', 'ASC')
                ->limit($limit)
                ->get()
                ->getResultArray();
        }, []);
    }

    /* ------------------------------------------------------------- UTILS */

    /**
     * @param array<string, mixed> $row
     */
    public function fullName(array $row): string
    {
        return trim((string) ($row['first_name'] ?? '') . ' ' . (string) ($row['last_name'] ?? ''));
    }

    /**
     * A compact "how long ago" label, or '-' when the date is missing.
     */
    public function since(string $timestamp): string
    {
        if ($timestamp === '' || $timestamp === null) {
            return '-';
        }

        $time = strtotime($timestamp);

        if ($time === false) {
            return '-';
        }

        $diff = time() - $time;

        if ($diff < 60) {
            return 'just now';
        }

        if ($diff < 3600) {
            return intdiv($diff, 60) . ' min ago';
        }

        if ($diff < 86400) {
            return intdiv($diff, 3600) . ' h ago';
        }

        if ($diff < 604800) {
            return intdiv($diff, 86400) . ' d ago';
        }

        return $this->prettyDate($timestamp);
    }

    /**
     * A human date, or '-'.
     */
    public function prettyDate(string $date): string
    {
        if ($date === '' || $date === null) {
            return '-';
        }

        $time = strtotime($date);

        return $time === false ? '-' : date('d M Y', $time);
    }
}
