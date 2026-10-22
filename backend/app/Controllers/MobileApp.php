<?php

namespace App\Controllers;

use App\Libraries\SchoolInsightService;
use App\Policies\RolePolicy;

/**
 * School Mobile surface (PWA shell).
 *
 * SERVES THE APPROVED UI.
 *
 * The approved "Mobile App Preview" reference is permanently read-only and is
 * NEVER modified. This controller works on a separate runtime copy
 * (app/Views/portal/mobile.html) whose DEMO literals were replaced by tokens.
 * Those tokens are filled with real data read from the signed-in user's OWN
 * school database.
 *
 * The role the app opens in is the role the session actually holds, resolved
 * server-side. The browser cannot choose a role: RoleFilter already limits
 * this surface to School Admins and Teachers, and the picker is filled from
 * the same authority rather than from a hard-coded list.
 *
 * Same tenant rules as the desktop school surface: the school is resolved
 * server-side from the session, never from a request (ADR-003).
 */
class MobileApp extends BaseController
{
    /** GET /m - the mobile app shell */
    public function index(): string
    {
        $html = (string) file_get_contents(APPPATH . 'Views/portal/mobile.html');

        if (strpos($html, '__ZEE_DATA__') === false) {
            throw new \RuntimeException('Mobile template token missing');
        }

        $html = str_replace('__ZEE_DATA__', $this->encode($this->collect()), $html);

        return $this->withWriteClient($html);
    }

    /**
     * @return array<string, mixed>
     */
    private function collect(): array
    {
        $access = new \App\Libraries\SchoolAccessService();

        $userId = auth()->loggedIn() ? (int) auth()->id() : null;
        $school = $access->schoolForUser($userId);

        $conn    = $school === null ? null : $access->connectionForSchoolId((int) $school->id);
        $insight = new SchoolInsightService($conn, $school === null ? null : (int) $school->id, $userId);

        $settings = $insight->settings();

        $schoolName = (string) ($school->name ?? 'Your School');
        $userName   = $this->signedInName();
        $role       = $this->signedInRole();

        $register = [];
        $marked   = 0;

        foreach ($insight->register() as $student) {
            $status = (string) ($student['today_status'] ?? '');

            if ($status !== '') {
                $marked++;
            }

            $register[] = [
                'name'    => $insight->fullName($student),
                'id'      => (string) ($student['admission_number'] ?? ''),
                'class'   => trim((string) ($student['class_name'] ?? '') . ' ' . (string) ($student['section_name'] ?? '')),
                'status'  => $status,
                'record'  => (int) ($student['id'] ?? 0),
            ];
        }

        $results = [];

        foreach ($insight->marks() as $mark) {
            $max = (float) ($mark['max_marks'] ?? 0);
            $got = (float) ($mark['marks_obtained'] ?? 0);

            $results[] = [
                'student' => $insight->fullName($mark),
                'exam'    => (string) ($mark['exam_name'] ?? ''),
                'marks'   => $max > 0 ? number_format($got, 2) . ' / ' . number_format($max, 2) : number_format($got, 2),
                'percent' => $max > 0 ? round($got * 100 / $max, 1) : 0.0,
                'assessment' => (int) ($mark['assessment_id'] ?? 0),
                'studentId'   => (int) ($mark['student_id'] ?? 0),
                'maxMarks'    => $max,
                'published'   => (string) ($mark['assessment_status'] ?? '') === 'published',
            ];
        }

        $fees = [];

        foreach ($insight->invoices() as $invoice) {
            $fees[] = [
                'student' => trim((string) ($invoice['first_name'] ?? '') . ' ' . (string) ($invoice['last_name'] ?? '')),
                'head'    => (string) ($invoice['fee_head'] ?? ''),
                'amount'  => 'PKR ' . number_format((float) ($invoice['amount'] ?? 0)),
                'settled' => 'PKR ' . number_format((float) ($invoice['paid_total'] ?? 0)),
                'due'     => $insight->prettyDate((string) ($invoice['due_date'] ?? '')),
                'status'  => ucfirst((string) ($invoice['status'] ?? 'due')),
            ];
        }

        $receipts = [];

        foreach ($insight->receipts() as $receipt) {
            $receipts[] = [
                'number' => (string) ($receipt['receipt_number'] ?? ''),
                'mode'   => ucfirst((string) ($receipt['payment_mode'] ?? '')),
                'amount' => 'PKR ' . number_format((float) ($receipt['amount_paid'] ?? 0)),
                'date'   => $insight->prettyDate((string) ($receipt['paid_at'] ?? '')),
            ];
        }

        $timetable = [];
        $days      = [1 => 'Mon', 2 => 'Tue', 3 => 'Wed', 4 => 'Thu', 5 => 'Fri', 6 => 'Sat', 7 => 'Sun'];

        foreach ($insight->timetable() as $row) {
            $timetable[] = [
                'day'      => $days[(int) ($row['day_of_week'] ?? 1)] ?? '—',
                'dayIndex' => (int) ($row['day_of_week'] ?? 1),
                'start'    => substr((string) ($row['start_time'] ?? ''), 0, 5),
                'end'      => substr((string) ($row['end_time'] ?? ''), 0, 5),
                'subject'  => (string) ($row['subject_name'] ?? ''),
                'location' => (string) ($row['location'] ?? ''),
                'teacher'  => trim((string) ($row['teacher_first_name'] ?? '') . ' ' . (string) ($row['teacher_last_name'] ?? '')),
            ];
        }

        $homework = [];

        foreach ($insight->homework() as $row) {
            $homework[] = [
                'title'   => (string) ($row['title'] ?? ''),
                'class'   => trim((string) ($row['class_name'] ?? '') . ' ' . (string) ($row['section_name'] ?? '')),
                'subject' => (string) ($row['subject_name'] ?? ''),
                'due'     => $insight->prettyDate((string) ($row['due_date'] ?? '')),
            ];
        }

        $notices = [];

        foreach ($insight->notices() as $row) {
            $notices[] = [
                'title'     => (string) ($row['title'] ?? ''),
                'content'   => (string) ($row['content'] ?? ''),
                'audience'  => ucfirst((string) ($row['audience'] ?? 'all')),
                'published' => (int) ($row['is_published'] ?? 0) === 1,
                'date'      => $insight->prettyDate((string) ($row['publish_date'] ?? $row['created_at'] ?? '')),
            ];
        }

        $students = [];

        foreach ($insight->students() as $student) {
            $students[] = [
                'name'     => $insight->fullName($student),
                'id'       => (string) ($student['admission_number'] ?? ''),
                'class'    => trim((string) ($student['class_name'] ?? '') . ' ' . (string) ($student['section_name'] ?? '')),
                'status'   => ucfirst((string) ($student['status'] ?? 'active')),
            ];
        }

        $staff = [];

        foreach ($insight->staff() as $member) {
            $staff[] = [
                'name'     => $insight->fullName($member),
                'role'     => (string) ($member['role_type'] ?? ''),
                'employee' => (string) ($member['employee_id'] ?? ''),
                'status'   => ucfirst((string) ($member['status'] ?? 'active')),
            ];
        }

        $documents = [];

        foreach ($insight->printTemplates() as $template) {
            $documents[] = [
                'key'  => (string) ($template['template_name'] ?? ''),
                'name' => (string) ($template['template_name'] ?? ''),
            ];
        }

        $calendar = $insight->calendar();
        $events   = [];

        foreach ($calendar['events'] as $event) {
            $events[] = [
                'date'  => (string) $event['date'],
                'title' => (string) $event['title'],
                'kind'  => (string) $event['kind'],
            ];
        }

        $assessments = [];

        foreach ($insight->assessments() as $assessment) {
            $assessments[] = [
                'id'      => (int) ($assessment['id'] ?? 0),
                'name'    => (string) ($assessment['exam_name'] ?? ''),
                'class'   => trim((string) ($assessment['class_name'] ?? '') . ' ' . (string) ($assessment['section_name'] ?? '')),
                'subject' => (string) ($assessment['subject_name'] ?? ''),
                'max'     => (float) ($assessment['max_marks'] ?? 0),
                'status'  => (string) ($assessment['status'] ?? 'draft'),
            ];
        }

        return [
            'school' => [
                'name'     => $schoolName,
                'code'     => strtoupper((string) ($school->school_code ?? '')) ?: '—',
                'domain'   => (string) ($school->branding_reference ?? ''),
                'initials' => $this->initials($schoolName),
            ],
            'user' => [
                'name'     => $userName,
                'initials' => $this->initials($userName),
                'role'     => $role,
            ],
            'roles'        => $this->rolesForSession(),
            'today'        => ['label' => date('l · d F Y'), 'date' => date('Y-m-d')],
            'register'     => $register,
            'classProgress' => ['marked' => (string) $marked, 'total' => (string) count($register)],
            'results'      => $results,
            'assessments'  => $assessments,
            'fees'         => $fees,
            'receipts'     => $receipts,
            'feeTotals'    => $insight->feeTotals(),
            'timetable'    => $timetable,
            'homework'     => $homework,
            'notices'      => $notices,
            'students'     => $students,
            'staff'        => $staff,
            'documents'    => $documents,
            'events'       => $events,
            'attendanceTrend' => $insight->attendanceTrend(7),
            'settings'     => $settings,
            'options'      => $insight->options(),
        ];
    }

    /**
     * The roles the signed-in session actually holds.
     *
     * The mobile preview used to offer Parent, Student, Teacher and School
     * Admin to anyone who opened the page. Only the roles the session really
     * holds are offered, so the app cannot be used to look at a surface the
     * signed-in user has no authority for.
     *
     * @return list<string>
     */
    private function rolesForSession(): array
    {
        $user = auth()->loggedIn() ? auth()->user() : null;

        $roles = [];

        if (RolePolicy::isSchoolAdmin($user)) {
            $roles[] = 'School Admin';
        }

        if (RolePolicy::isTeacher($user)) {
            $roles[] = 'Teacher';
        }

        if ($roles === []) {
            $roles[] = 'School user';
        }

        return $roles;
    }

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
        $user = auth()->loggedIn() ? auth()->user() : null;

        if (RolePolicy::isSchoolAdmin($user)) {
            return 'School Admin';
        }

        if (RolePolicy::isTeacher($user)) {
            return 'Teacher';
        }

        return 'School user';
    }

    private function initials(string $name): string
    {
        $parts     = preg_split('/\s+/', trim($name)) ?: [];
        $initials  = '';

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

    private function encode(mixed $value): string
    {
        return (string) json_encode(
            $value,
            JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
        );
    }
}
