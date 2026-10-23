<?php

namespace App\Controllers;

use App\Libraries\SchoolInsightService;
use App\Libraries\SchoolRecordService;

/**
 * School JSON API.
 *
 * The write endpoints that were missing: students, staff, attendance, fees.
 * Plus the read endpoints the school workspace needs, so every figure on
 * screen comes from the school's own database.
 *
 * SECURITY CONTRACT:
 *  - Every route is behind session authentication AND a school role.
 *  - The school is resolved SERVER-SIDE from the signed-in session. There is
 *    no school id in any route, query string or body (ADR-003).
 *  - All writes go to that school's OWN dedicated database through
 *    SchoolAccessService. The control plane is never written to.
 *  - All input is validated and bound as query parameters.
 *  - JSON only; no HTML is returned.
 */
class SchoolApi extends BaseController
{
    /** GET /api/school/overview */
    public function overview()
    {
        $insight = $this->insight();

        if ($insight === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json(['ok' => true, 'overview' => $this->overviewPayload($insight)]);
    }

    /** GET /api/school/students */
    public function students()
    {
        $insight = $this->insight();

        if ($insight === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json(['ok' => true, 'students' => $insight->students()]);
    }

    /** GET /api/school/invoices */
    public function invoices()
    {
        $insight = $this->insight();

        if ($insight === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json(['ok' => true, 'invoices' => $insight->invoices()]);
    }

    /** GET /api/school/staff */
    public function staff()
    {
        $insight = $this->insight();

        if ($insight === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json(['ok' => true, 'staff' => $insight->staff()]);
    }

    /** GET /api/school/attendance?date=YYYY-MM-DD */
    public function attendance()
    {
        $insight = $this->insight();

        if ($insight === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        $date = (string) ($this->request->getGet('date') ?? date('Y-m-d'));

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) !== 1) {
            $date = date('Y-m-d');
        }

        return $this->json([
            'ok'         => true,
            'date'       => $date,
            'register'   => $insight->register($date),
            'trend'      => $insight->attendanceTrend(7),
        ]);
    }

    /** GET /api/school/marks */
    public function marks()
    {
        $insight = $this->insight();

        if ($insight === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        $assessment = (int) ($this->request->getGet('assessment_id') ?? 0);

        return $this->json([
            'ok'          => true,
            'assessments' => $insight->assessments(),
            'marks'       => $insight->marks($assessment > 0 ? $assessment : null),
        ]);
    }

    /** GET /api/school/timetable */
    public function timetable()
    {
        $insight = $this->insight();

        if ($insight === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json([
            'ok'        => true,
            'timetable' => $insight->timetable(),
            'homework'  => $insight->homework(),
        ]);
    }

    /** GET /api/school/notices */
    public function notices()
    {
        $insight = $this->insight();

        if ($insight === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json(['ok' => true, 'notices' => $insight->notices()]);
    }

    /** GET /api/school/receipts */
    public function receipts()
    {
        $insight = $this->insight();

        if ($insight === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json([
            'ok'       => true,
            'receipts' => $insight->receipts(),
            'totals'   => $insight->feeTotals(),
        ]);
    }

    /** GET /api/school/settings */
    public function settings()
    {
        $insight = $this->insight();

        if ($insight === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json([
            'ok'       => true,
            'settings' => $insight->settings(),
            'options'  => $insight->options(),
        ]);
    }

    /** GET /api/school/options */
    public function options()
    {
        $insight = $this->insight();

        if ($insight === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json(['ok' => true, 'options' => $insight->options()]);
    }

    /** POST /api/school/students */
    public function createStudent()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json($svc->createStudent($this->body()));
    }

    /** POST /api/school/staff */
    public function createStaff()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json($svc->createStaff($this->body()));
    }

    /** POST /api/school/attendance */
    public function markAttendance()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json($svc->markAttendance($this->body()));
    }

    /** POST /api/school/attendance/batch */
    public function markAttendanceBatch()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json($svc->markAttendanceBatch($this->body()));
    }

    /** POST /api/school/fees/invoices */
    public function createInvoice()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json($svc->createFeeInvoice($this->body()));
    }

    /** POST /api/school/fees/receipts */
    public function recordReceipt()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json($svc->recordReceipt($this->body()));
    }

    /** POST /api/school/settings */
    public function saveSettings()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json($svc->saveSettings($this->body()));
    }

    /** POST /api/school/assessments */
    public function createAssessment()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json($svc->createAssessment($this->body()));
    }

    /** POST /api/school/marks */
    public function saveMarks()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json($svc->saveMarks($this->body()));
    }

    /** POST /api/school/assessments/status */
    public function setAssessmentStatus()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json($svc->setAssessmentStatus($this->body()));
    }

    /** POST /api/school/homework */
    public function createHomework()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json($svc->createHomework($this->body()));
    }

    /** POST /api/school/timetable */
    public function createTimetableEntry()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json($svc->createTimetableEntry($this->body()));
    }

    /** POST /api/school/notices */
    public function createNotice()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => $this->writeRefusal()], 403);
        }

        return $this->json($svc->createNotice($this->body()));
    }

    /**
     * The whole dashboard payload, used by the workspace and by the API.
     *
     * @return array<string, mixed>
     */
    private function overviewPayload(SchoolInsightService $insight): array
    {
        return [
            'stats'          => $this->stats($insight),
            'students'       => $insight->students(),
            'register'       => $insight->register(),
            'attendanceTrend' => $insight->attendanceTrend(7),
            'topClasses'     => $insight->topClasses(),
            'grades'         => $insight->gradeDistribution(),
            'feeTrend'       => $insight->feeTrend(6),
            'feeTotals'      => $insight->feeTotals(),
            'invoices'       => $insight->invoices(),
            'receipts'       => $insight->receipts(),
            'assessments'    => $insight->assessments(),
            'marks'          => $insight->marks(),
            'timetable'      => $insight->timetable(),
            'homework'       => $insight->homework(),
            'notices'        => $insight->notices(),
            'staff'          => $insight->staff(),
            'activity'       => $insight->activity(),
            'calendar'       => $insight->calendar(),
            'settings'       => $insight->settings(),
            'options'        => $insight->options(),
            'templates'      => $insight->printTemplates(),
        ];
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

        $activeStaff = 0;
        $teacherCount = 0;

        foreach ($staff as $member) {
            if ((string) ($member['status'] ?? 'active') !== 'active') {
                continue;
            }

            $activeStaff++;

            $role = strtolower((string) ($member['role_type'] ?? ''));

            if (str_contains($role, 'teacher') || str_contains($role, 'principal') || str_contains($role, 'head')) {
                $teacherCount++;
            }
        }

        [$present, $total, $percent] = $insight->attendanceToday();

        $collected = $insight->collectedBetween('1970-01-01', '2999-12-31 23:59:59');

        return [
            ['&#9812;', 'Enrolled students', (string) count($students), 'in this school', '-', '#3b82f6'],
            ['&#9823;', 'Active guardians', (string) $guardians, 'linked accounts', '-', '#10b981'],
            ['&#9818;', 'Active staff', (string) $activeStaff, $teacherCount . ' teaching roles', '-', '#ec4899'],
            ['&#10003;', 'Attendance today', $total > 0 ? $percent . '%' : '-', $total > 0 ? $present . ' of ' . $total . ' marked' : 'not recorded', '-', '#f59e0b'],
            ['&#8368;', 'Fees collected', 'PKR ' . number_format($collected), 'received', '-', '#8b5cf6'],
        ];
    }

    /**
     * Build the service on the signed-in user's OWN school connection.
     */
    private function service(): ?SchoolRecordService
    {
        $insight = $this->insight();

        if ($insight === null) {
            return null;
        }

        $conn = $insight->db();

        if ($conn === null) {
            return null;
        }

        $userId = auth()->loggedIn() ? (int) auth()->id() : null;

        $schoolId = service('schoolAccess')->schoolIdForUser($userId);

        return new SchoolRecordService($conn, $schoolId, $userId);
    }

    /**
     * The reason a write could not run, so the caller is told the truth.
     */
    private function writeRefusal(): string
    {
        $userId = auth()->loggedIn() ? (int) auth()->id() : null;

        if ($userId === null) {
            return 'No school is linked to this account';
        }

        $school = service('schoolAccess')->schoolForUser($userId);

        if ($school === null) {
            return 'No school is linked to this account';
        }

        return 'This school installation has no database yet';
    }

    /**
     * The insight service bound to the signed-in user's own school.
     */
    private function insight(): ?SchoolInsightService
    {
        $userId = auth()->loggedIn() ? (int) auth()->id() : null;

        if ($userId === null) {
            return null;
        }

        $access = new \App\Libraries\SchoolAccessService();
        $school = $access->schoolForUser($userId);

        if ($school === null) {
            return null;
        }

        $conn = $access->connectionForSchoolId((int) $school->id);

        if ($conn === null) {
            // A school with no database yet still has a workspace. The insight
            // service answers zero / empty for every read.
            return new SchoolInsightService(null, (int) $school->id, $userId);
        }

        return new SchoolInsightService($conn, (int) $school->id, $userId);
    }

    /**
     * Decoded JSON body, or an empty array.
     *
     * @return array<string, mixed>
     */
    private function body(): array
    {
        $raw = $this->request->getBody();

        if ($raw === '' || $raw === null) {
            return [];
        }

        $data = json_decode((string) $raw, true);

        return is_array($data) ? $data : [];
    }

    private function json(array $payload, int $status = 200)
    {
        return $this->response
            ->setStatusCode($status)
            ->setJSON($payload);
    }
}
