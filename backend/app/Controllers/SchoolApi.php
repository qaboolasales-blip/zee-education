<?php

namespace App\Controllers;

/**
 * School JSON API.
 *
 * The write endpoints that were missing: students, staff, attendance, fees.
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
    /** GET /api/school/students */
    public function students()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => 'No school is linked to this account'], 403);
        }

        return $this->json(['ok' => true, 'students' => $svc->listStudents()]);
    }

    /** GET /api/school/invoices */
    public function invoices()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => 'No school is linked to this account'], 403);
        }

        return $this->json(['ok' => true, 'invoices' => $svc->listInvoices()]);
    }

    /** POST /api/school/students */
    public function createStudent()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => 'No school is linked to this account'], 403);
        }

        return $this->json($svc->createStudent($this->body()));
    }

    /** POST /api/school/staff */
    public function createStaff()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => 'No school is linked to this account'], 403);
        }

        return $this->json($svc->createStaff($this->body()));
    }

    /** POST /api/school/attendance */
    public function markAttendance()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => 'No school is linked to this account'], 403);
        }

        return $this->json($svc->markAttendance($this->body()));
    }

    /** POST /api/school/fees/invoices */
    public function createInvoice()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => 'No school is linked to this account'], 403);
        }

        return $this->json($svc->createFeeInvoice($this->body()));
    }

    /** POST /api/school/fees/receipts */
    public function recordReceipt()
    {
        $svc = $this->service();

        if ($svc === null) {
            return $this->json(['ok' => false, 'message' => 'No school is linked to this account'], 403);
        }

        return $this->json($svc->recordReceipt($this->body()));
    }

    /**
     * Build the service on the signed-in user's OWN school connection.
     */
    private function service(): ?\App\Libraries\SchoolRecordService
    {
        $access = new \App\Libraries\SchoolAccessService();

        $userId = auth()->loggedIn() ? (int) auth()->id() : null;
        $school = $access->schoolForUser($userId);

        if ($school === null) {
            return null;
        }

        $conn = $access->connectionForSchoolId((int) $school->id);

        if ($conn === null) {
            return null;
        }

        return new \App\Libraries\SchoolRecordService($conn, (int) $school->id);
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