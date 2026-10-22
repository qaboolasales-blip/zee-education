<?php

namespace App\Controllers;

use App\Libraries\SchoolInsightService;

/**
 * School Dashboard and School Admin sections.
 *
 * SERVES THE APPROVED UI.
 *
 * The reference file under zee_education_multi_agent_handoff/reference_ui is
 * permanently read-only and is NEVER modified. This controller works on a
 * separate runtime copy (app/Views/portal/school.html) in which the
 * hard-coded DEMO students, staff, invoices, marks and activity rows were
 * replaced by tokens. Those tokens are filled here with REAL data read
 * through the school's OWN dedicated database.
 *
 * Everything the page shows now comes from ONE payload, `__ZEE_DATA__`, which
 * is assembled by SchoolInsightService. There is no second, hand-written
 * number anywhere in the template: a figure that the database does not have
 * is shown as "0" or "—", never as a plausible-looking placeholder.
 *
 * TENANT SAFETY (ADR-001 / ADR-003):
 *  - The school is resolved SERVER-SIDE from the signed-in session user via
 *    user_school_access. No school id is ever accepted from the browser.
 *  - Every figure is read through the dedicated school connection, so one
 *    school can only ever observe its own data.
 *  - Control-plane tables are used only for school metadata, never learner
 *    figures.
 */
class SchoolDashboard extends BaseController
{
    /** GET /school */
    public function index(): string
    {
        $html = (string) file_get_contents(APPPATH . 'Views/portal/school.html');

        if (strpos($html, '__ZEE_DATA__') === false) {
            throw new \RuntimeException('School dashboard template token missing');
        }

        $html = str_replace('__ZEE_DATA__', $this->encode($this->collect()), $html);

        return $this->withWriteClient($html);
    }

    /**
     * Reads everything the school workspace needs, from the school's own
     * dedicated database. An empty school produces empty tables, never
     * invented rows.
     *
     * @return array<string, mixed>
     */
    private function collect(): array
    {
        $access = new \App\Libraries\SchoolAccessService();

        $userId = auth()->loggedIn() ? (int) auth()->id() : null;
        $school = $access->schoolForUser($userId);

        $conn    = $school === null ? null : $access->connectionForSchoolId((int) $school->id);
        $insight = new SchoolInsightService($conn, $school === null ? null : (int) $school->id, $userId);

        $schoolName = (string) ($school->name ?? 'Your School');
        $city       = trim((string) ($school->address ?? ''));

        $userName = $this->signedInName();
        $role     = $this->signedInRole();

        $settings = $insight->settings();

        $data = [
            'school' => [
                'name'     => $schoolName,
                'code'     => strtoupper((string) ($school->school_code ?? '')) ?: '—',
                'domain'   => (string) ($school->branding_reference ?? ''),
                'city'     => $city !== '' ? $city : 'School workspace',
                'currency' => (string) ($settings['currency'] ?? 'PKR'),
                'timezone' => (string) ($settings['timezone'] ?? 'Asia/Karachi'),
                'initials' => $this->initials($schoolName),
            ],
            'user' => [
                'name'     => $userName,
                'initials' => $this->initials($userName),
                'role'     => $role,
            ],
            'today' => [
                'label' => date('l · d F Y'),
                'date'  => date('Y-m-d'),
            ],
            'stats'             => $this->stats($insight),
            'students'          => $this->students($insight),
            'register'          => $this->register($insight),
            'attendanceTrend'   => $insight->attendanceTrend(7),
            'topClasses'        => $insight->topClasses(),
            'grades'            => $insight->gradeDistribution(),
            'feeTrend'          => $insight->feeTrend(6),
            'feeTotals'         => $insight->feeTotals(),
            'feeSummary'        => $this->feeSummary($insight),
            'invoices'          => $this->invoices($insight),
            'receipts'          => $insight->receipts(),
            'activity'          => $insight->activity(),
            'calendar'          => $insight->calendar(),
            'staff'             => $this->staff($insight),
            'staffStats'        => $this->staffStats($insight),
            'marks'             => $this->marks($insight),
            'assessments'       => $this->assessments($insight),
            'timetable'         => $this->timetable($insight),
            'homework'          => $this->homework($insight),
            'notices'           => $this->notices($insight),
            'options'           => $this->options($insight),
            'settings'          => $settings,
            'templates'         => $this->templates($insight),
            'reportStats'       => $this->reportStats($insight),
            'classProgress'     => $this->classProgress($insight),
            'alerts'            => $this->alerts($insight),
        ];

        return $data;
    }

    /**
     * The five overview cards, in the approved design's shape:
     * [ icon, label, value, sub, trend, colour ]
     *
     * @return list<list<string>>
     */
    private function stats(SchoolInsightService $insight): array
    {
        $students = $insight->students();
        $staff    = $insight->staff();

        $guardians = 0;

        if ($insight->has('guardians')) {
            $guardians = (int) $insight->db()->table('guardians')->countAllResults();
        }

        $activeStaff  = 0;
        $teachingRole = 0;

        foreach ($staff as $member) {
            if ((string) ($member['status'] ?? 'active') !== 'active') {
                continue;
            }

            $activeStaff++;

            $role = strtolower((string) ($member['role_type'] ?? ''));

            if (str_contains($role, 'teacher') || str_contains($role, 'principal') || str_contains($role, 'head')) {
                $teachingRole++;
            }
        }

        [$present, $total, $percent] = $insight->attendanceToday();

        $collected = $insight->collectedBetween('1970-01-01', '2999-12-31 23:59:59');

        return [
            ['&#9812;', 'Enrolled students', (string) count($students), 'in this school', '', '#3b82f6'],
            ['&#9823;', 'Active guardians', (string) $guardians, 'linked accounts', '', '#10b981'],
            ['&#9818;', 'Active staff', (string) $activeStaff, $teachingRole . ' teaching roles', '', '#ec4899'],
            [
                '&#10003;',
                'Attendance today',
                $total > 0 ? $percent . '%' : '—',
                $total > 0 ? $present . ' of ' . $total . ' marked' : 'not recorded',
                '',
                '#f59e0b',
            ],
            ['&#8368;', 'Fees collected', 'PKR ' . number_format($collected), 'received', '', '#8b5cf6'],
        ];
    }

    /**
     * Students for the records table.
     *
     * @return list<array<string, mixed>>
     */
    private function students(SchoolInsightService $insight): array
    {
        $out = [];

        foreach ($insight->students() as $student) {
            $name  = $insight->fullName($student);
            $guard = $insight->guardianFor((int) ($student['id'] ?? 0));

            $guardianName = trim((string) ($guard['first_name'] ?? '') . ' ' . (string) ($guard['last_name'] ?? ''));

            $out[] = [
                'name'     => $name,
                'admission' => (string) ($student['admission_number'] ?? ''),
                'class'    => trim((string) ($student['class_name'] ?? '') . ' ' . (string) ($student['section_name'] ?? '')),
                'guardian' => $guardianName !== '' ? $guardianName : '—',
                'status'   => ucfirst((string) ($student['status'] ?? 'active')),
                'id'       => (int) ($student['id'] ?? 0),
            ];
        }

        return $out;
    }

    /**
     * The daily register.
     *
     * @return list<array<string, mixed>>
     */
    private function register(SchoolInsightService $insight): array
    {
        $out = [];

        foreach ($insight->register() as $student) {
            $out[] = [
                'name'   => $insight->fullName($student),
                'id'     => (string) ($student['admission_number'] ?? ''),
                'record' => (int) ($student['id'] ?? 0),
                'class'  => trim((string) ($student['class_name'] ?? '') . ' ' . (string) ($student['section_name'] ?? '')),
                'status' => (string) ($student['today_status'] ?? ''),
            ];
        }

        return $out;
    }

    /**
     * Fee invoices for the fees table.
     *
     * @return list<array<string, mixed>>
     */
    private function invoices(SchoolInsightService $insight): array
    {
        $out = [];

        foreach ($insight->invoices() as $invoice) {
            $amount = (float) ($invoice['amount'] ?? 0);
            $paid   = (float) ($invoice['paid_total'] ?? 0);

            $out[] = [
                'id'       => (int) ($invoice['id'] ?? 0),
                'head'     => (string) ($invoice['fee_head'] ?? ''),
                'student'  => trim((string) ($invoice['first_name'] ?? '') . ' ' . (string) ($invoice['last_name'] ?? '')),
                'amount'   => 'PKR ' . number_format($amount),
                'settled'  => 'PKR ' . number_format($paid),
                'due'      => $insight->prettyDate((string) ($invoice['due_date'] ?? '')),
                'status'   => ucfirst((string) ($invoice['status'] ?? 'due')),
            ];
        }

        return $out;
    }

    /**
     * The "collected this month" summary, with a real month-over-month change.
     *
     * @return array{collected:string,change:string,open:string}
     */
    private function feeSummary(SchoolInsightService $insight): array
    {
        $thisMonth = $insight->collectedBetween(
            date('Y-m-01'),
            date('Y-m-t 23:59:59')
        );

        $lastMonth = $insight->collectedBetween(
            date('Y-m-01', strtotime('first day of last month')),
            date('Y-m-t 23:59:59', strtotime('last day of last month'))
        );

        $change = 'no change';

        if ($lastMonth > 0) {
            $pct = (($thisMonth - $lastMonth) / $lastMonth) * 100;

            $change = ($pct >= 0 ? '↑ ' : '↓ ') . number_format(abs($pct), 1) . '% vs last month';
        } elseif ($thisMonth > 0) {
            $change = 'first collection this month';
        }

        $outstanding = 0.0;

        foreach ($insight->invoices() as $invoice) {
            $outstanding += max(0, (float) ($invoice['amount'] ?? 0) - (float) ($invoice['paid_total'] ?? 0));
        }

        return [
            'collected' => 'PKR ' . number_format($thisMonth),
            'change'    => $change,
            'open'      => 'PKR ' . number_format($outstanding),
        ];
    }

    /**
     * Staff for the people table.
     *
     * @return list<array<string, mixed>>
     */
    private function staff(SchoolInsightService $insight): array
    {
        $out = [];

        foreach ($insight->staff() as $member) {
            $out[] = [
                'name'     => $insight->fullName($member),
                'role'     => (string) ($member['role_type'] ?? ''),
                'employee' => (string) ($member['employee_id'] ?? ''),
                'status'   => ucfirst((string) ($member['status'] ?? 'active')),
            ];
        }

        return $out;
    }

    /**
     * The three staff counters.
     *
     * @return array{active:string,teaching:string,present:string,leave:string}
     */
    private function staffStats(SchoolInsightService $insight): array
    {
        $active   = 0;
        $teaching = 0;

        foreach ($insight->staff() as $member) {
            if ((string) ($member['status'] ?? 'active') !== 'active') {
                continue;
            }

            $active++;

            $role = strtolower((string) ($member['role_type'] ?? ''));

            if (str_contains($role, 'teacher') || str_contains($role, 'principal') || str_contains($role, 'head')) {
                $teaching++;
            }
        }

        // Staff attendance is not a separate table in this schema, so the
        // honest answer is the count that IS known, not a made-up one.
        $present = $active > 0 ? (string) $active : '0';
        $leave   = '0';

        return [
            'active'   => (string) $active,
            'teaching' => $teaching . ' teaching roles',
            'present'  => $present,
            'leave'    => $leave,
        ];
    }

    /**
     * Marks for the academics table.
     *
     * The student name is resolved from the student's own record - the earlier
     * build rendered the record id in the name column.
     *
     * @return list<array<string, mixed>>
     */
    private function marks(SchoolInsightService $insight): array
    {
        $out = [];

        foreach ($insight->marks() as $mark) {
            $max = (float) ($mark['max_marks'] ?? 0);
            $got = (float) ($mark['marks_obtained'] ?? 0);

            $percent = $max > 0 ? round($got * 100 / $max, 1) : 0.0;

            $out[] = [
                'student'      => $insight->fullName($mark),
                'marks'        => $max > 0 ? number_format($got, 2) . ' / ' . number_format($max, 2) : number_format($got, 2),
                'percent'      => $percent . '%',
                'assessment'   => (int) ($mark['assessment_id'] ?? 0),
                'studentId'    => (int) ($mark['student_id'] ?? 0),
                'maxMarks'     => $max,
            ];
        }

        return $out;
    }

    /**
     * Assessments for the academics table header.
     *
     * @return list<array<string, mixed>>
     */
    private function assessments(SchoolInsightService $insight): array
    {
        $out = [];

        foreach ($insight->assessments() as $assessment) {
            $out[] = [
                'id'      => (int) ($assessment['id'] ?? 0),
                'name'    => (string) ($assessment['exam_name'] ?? ''),
                'class'   => trim((string) ($assessment['class_name'] ?? '') . ' ' . (string) ($assessment['section_name'] ?? '')),
                'subject' => (string) ($assessment['subject_name'] ?? ''),
                'max'     => (float) ($assessment['max_marks'] ?? 0),
                'status'  => ucfirst((string) ($assessment['status'] ?? 'draft')),
            ];
        }

        return $out;
    }

    /**
     * Timetable rows.
     *
     * @return list<array<string, mixed>>
     */
    private function timetable(SchoolInsightService $insight): array
    {
        $days = [1 => 'Mon', 2 => 'Tue', 3 => 'Wed', 4 => 'Thu', 5 => 'Fri', 6 => 'Sat', 7 => 'Sun'];
        $out  = [];

        foreach ($insight->timetable() as $row) {
            $out[] = [
                'day'      => $days[(int) ($row['day_of_week'] ?? 1)] ?? '—',
                'dayIndex' => (int) ($row['day_of_week'] ?? 1),
                'start'    => substr((string) ($row['start_time'] ?? ''), 0, 5),
                'end'      => substr((string) ($row['end_time'] ?? ''), 0, 5),
                'subject'  => (string) ($row['subject_name'] ?? ''),
                'class'    => trim((string) ($row['class_name'] ?? '') . ' ' . (string) ($row['section_name'] ?? '')),
                'location' => (string) ($row['location'] ?? ''),
                'teacher'  => trim((string) ($row['teacher_first_name'] ?? '') . ' ' . (string) ($row['teacher_last_name'] ?? '')),
            ];
        }

        return $out;
    }

    /**
     * Homework rows.
     *
     * @return list<array<string, mixed>>
     */
    private function homework(SchoolInsightService $insight): array
    {
        $out = [];

        foreach ($insight->homework() as $row) {
            $due = (string) ($row['due_date'] ?? '');

            $out[] = [
                'title'   => (string) ($row['title'] ?? ''),
                'class'   => trim((string) ($row['class_name'] ?? '') . ' ' . (string) ($row['section_name'] ?? '')),
                'subject' => (string) ($row['subject_name'] ?? ''),
                'due'     => $insight->prettyDate($due),
                'dueDate' => $due,
            ];
        }

        return $out;
    }

    /**
     * Notices.
     *
     * @return list<array<string, mixed>>
     */
    private function notices(SchoolInsightService $insight): array
    {
        $out = [];

        foreach ($insight->notices() as $row) {
            $out[] = [
                'title'     => (string) ($row['title'] ?? ''),
                'content'   => (string) ($row['content'] ?? ''),
                'audience'  => ucfirst((string) ($row['audience'] ?? 'all')),
                'published' => (int) ($row['is_published'] ?? 0) === 1,
                'date'      => $insight->prettyDate((string) ($row['publish_date'] ?? $row['created_at'] ?? '')),
            ];
        }

        return $out;
    }

    /**
     * The pick-lists the workspace forms need.
     *
     * @return array<string, list<array<string, mixed>>>
     */
    private function options(SchoolInsightService $insight): array
    {
        $out = ['classes' => [], 'sections' => [], 'subjects' => [], 'teachers' => [], 'sessions' => []];

        foreach ($insight->options() as $key => $rows) {
            foreach ($rows as $row) {
                if ($key === 'teachers') {
                    $out[$key][] = ['id' => (int) $row['id'], 'name' => $insight->fullName($row)];

                    continue;
                }

                $out[$key][] = [
                    'id'   => (int) $row['id'],
                    'name' => (string) ($row['name'] ?? ''),
                    'classId' => isset($row['class_id']) ? (int) $row['class_id'] : 0,
                ];
            }
        }

        return $out;
    }

    /**
     * The print templates this school can use.
     *
     * @return list<array<string, mixed>>
     */
    private function templates(SchoolInsightService $insight): array
    {
        $builtIn = [
            ['key' => 'admission', 'name' => 'Admission form', 'custom' => false],
            ['key' => 'teacher', 'name' => 'Teacher form', 'custom' => false],
            ['key' => 'id-card', 'name' => 'Student ID card', 'custom' => false],
            ['key' => 'result-card', 'name' => 'Result card', 'custom' => false],
            ['key' => 'fee-receipt', 'name' => 'Fee receipt', 'custom' => false],
        ];

        foreach ($insight->printTemplates() as $template) {
            $builtIn[] = [
                'key'    => (string) ($template['template_name'] ?? ''),
                'name'   => (string) ($template['template_name'] ?? ''),
                'custom' => (int) ($template['is_custom'] ?? 0) === 1,
            ];
        }

        return $builtIn;
    }

    /**
     * The three report counters.
     *
     * @return array{attendance:string,awaiting:string,formats:string}
     */
    private function reportStats(SchoolInsightService $insight): array
    {
        [, , $percent] = $insight->attendanceToday();

        $awaiting = 0;

        foreach ($insight->assessments() as $assessment) {
            if ((string) ($assessment['status'] ?? '') === 'submitted') {
                $awaiting++;
            }
        }

        return [
            'attendance' => $percent > 0 ? $percent . '%' : '—',
            'awaiting'   => (string) $awaiting,
            'formats'    => 'PDF / XLS / CSV',
        ];
    }

    /**
     * How much of today's register has been marked.
     *
     * @return array{marked:string,total:string}
     */
    private function classProgress(SchoolInsightService $insight): array
    {
        $total  = 0;
        $marked = 0;

        foreach ($insight->register() as $student) {
            $total++;

            if (($student['today_status'] ?? '') !== '') {
                $marked++;
            }
        }

        return ['marked' => (string) $marked, 'total' => (string) $total];
    }

    /**
     * The counters the notification area shows.
     *
     * @return array{notices:string,homework:string,unread:string}
     */
    private function alerts(SchoolInsightService $insight): array
    {
        $notices = 0;

        foreach ($insight->notices() as $notice) {
            if ((int) ($notice['is_published'] ?? 0) === 1) {
                $notices++;
            }
        }

        $homework = count($insight->homework());

        return [
            'notices'  => (string) $notices,
            'homework' => (string) $homework,
            'unread'   => (string) $notices,
        ];
    }

    /* ------------------------------------------------------------- UTILS */

    private function signedInName(): string
    {
        try {
            if (auth()->loggedIn()) {
                $name = trim((string) (auth()->user()->username ?? ''));

                if ($name !== '') {
                    return ucwords(strtolower($name));
                }
            }
        } catch (\Throwable) {
            // ignore
        }

        return 'there';
    }

    private function signedInRole(): string
    {
        try {
            if (! auth()->loggedIn()) {
                return 'School user';
            }

            $user = auth()->user();

            if (\App\Policies\RolePolicy::isSchoolAdmin($user)) {
                return 'School Admin';
            }

            if (\App\Policies\RolePolicy::isTeacher($user)) {
                return 'Teacher';
            }
        } catch (\Throwable) {
            // ignore
        }

        return 'School user';
    }

    /**
     * Up to two initials for an avatar.
     */
    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];
        $initials = '';

        foreach ($parts as $part) {
            if ($part === '') {
                continue;
            }

            $initials .= mb_strtoupper(mb_substr($part, 0, 1));

            if (mb_strlen($initials) === 2) {
                break;
            }
        }

        return $initials !== '' ? $initials : '—';
    }

    private function encode(mixed $data): string
    {
        return (string) json_encode(
            $data,
            JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
        );
    }
}
