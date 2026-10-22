<?php

namespace App\Controllers;

use App\Libraries\SchoolInsightService;

/**
 * Real exports and real print documents for the school workspace.
 *
 * Before this controller the school dashboard's "Export" and "Print / PDF"
 * buttons only fired a toast. They now produce the actual artefact:
 *
 *   GET /api/school/export/students     -> CSV of the school's own students
 *   GET /api/school/export/fees         -> CSV of the school's own invoices
 *   GET /api/school/export/attendance   -> CSV of the school's own attendance
 *   GET /api/school/print/{template}    -> a printable HTML document
 *
 * SECURITY CONTRACT:
 *  - Session + school role + licence required, exactly like the school API.
 *  - The school is resolved server-side from the signed-in session. The
 *    `template` segment names a document kind, never a tenant.
 *  - Only rows from the signed-in user's own school database are exported.
 */
class SchoolExport extends BaseController
{
    /** The document kinds the school workspace can print. */
    private const TEMPLATES = [
        'admission'  => 'Admission form',
        'teacher'    => 'Teacher form',
        'id-card'    => 'Student ID card',
        'result-card' => 'Result card',
        'fee-receipt' => 'Fee receipt',
    ];

    /** GET /api/school/export/{kind} */
    public function csv(string $kind = 'students')
    {
        $insight = $this->insight();

        if ($insight === null) {
            return $this->failure('No school is linked to this account', 403);
        }

        $kind = strtolower($kind);

        [$columns, $rows] = match ($kind) {
            'fees'       => $this->feeRows($insight),
            'attendance' => $this->attendanceRows($insight),
            default      => $this->studentRows($insight),
        };

        $name = 'students';

        if ($kind === 'fees') {
            $name = 'fee-invoices';
        } elseif ($kind === 'attendance') {
            $name = 'attendance';
        }

        $body = $this->toCsv($columns, $rows);

        return $this->response
            ->setStatusCode(200)
            ->setHeader('Content-Type', 'text/csv; charset=utf-8')
            ->setHeader('Content-Disposition', 'attachment; filename="zee-' . $name . '-' . date('Y-m-d') . '.csv"')
            ->setHeader('Cache-Control', 'no-store')
            ->setBody($body);
    }

    /** GET /api/school/print/{template} */
    public function print(string $template = 'admission')
    {
        $insight = $this->insight();

        if ($insight === null) {
            return $this->failure('No school is linked to this account', 403);
        }

        $template = strtolower($template);

        if (! isset(self::TEMPLATES[$template])) {
            return $this->failure('That print template does not exist', 404);
        }

        $school = service('schoolAccess')->schoolForUser(auth()->loggedIn() ? (int) auth()->id() : null);

        $settings = $insight->settings();

        $data = [
            'title'    => self::TEMPLATES[$template],
            'school'   => (string) ($school->name ?? 'Your School'),
            'code'     => (string) ($school->school_code ?? ''),
            'address'  => (string) ($school->address ?? ''),
            'phone'    => (string) ($school->contact_phone ?? ''),
            'email'    => (string) ($school->contact_email ?? ''),
            'currency' => (string) ($settings['currency'] ?? 'PKR'),
            'primary'  => (string) ($settings['brand_primary'] ?? '#2563eb'),
            'secondary' => (string) ($settings['brand_secondary'] ?? '#1e3a8a'),
            'printed'  => date('d M Y, H:i'),
            'rows'     => [],
        ];

        switch ($template) {
            case 'id-card':
                $data['rows'] = $this->idCardRows($insight);
                break;

            case 'result-card':
                $data['rows'] = $this->resultRows($insight);
                break;

            case 'fee-receipt':
                $data['rows'] = $this->receiptRows($insight);
                break;

            case 'teacher':
                $data['rows'] = $this->teacherRows($insight);
                break;

            default:
                $data['rows'] = $this->studentRows($insight);
                break;
        }

        $html = view('portal/print-document', ['data' => $data]);

        return $this->response
            ->setStatusCode(200)
            ->setHeader('Content-Type', 'text/html; charset=utf-8')
            ->setHeader('Cache-Control', 'no-store')
            ->setBody($html);
    }

    /* ------------------------------------------------------------- ROWS */

    /**
     * @return array{0:list<string>,1:list<list<string>>}
     */
    private function studentRows(SchoolInsightService $insight): array
    {
        $columns = ['Admission number', 'First name', 'Last name', 'Class', 'Section', 'Gender', 'Status', 'Date of birth'];
        $rows    = [];

        foreach ($insight->students() as $student) {
            $rows[] = [
                (string) ($student['admission_number'] ?? ''),
                (string) ($student['first_name'] ?? ''),
                (string) ($student['last_name'] ?? ''),
                (string) ($student['class_name'] ?? ''),
                (string) ($student['section_name'] ?? ''),
                (string) ($student['gender'] ?? ''),
                (string) ($student['status'] ?? ''),
                (string) ($student['date_of_birth'] ?? ''),
            ];
        }

        return [$columns, $rows];
    }

    /**
     * @return array{0:list<string>,1:list<list<string>>}
     */
    private function feeRows(SchoolInsightService $insight): array
    {
        $columns = ['Invoice', 'Student', 'Admission number', 'Fee head', 'Amount', 'Settled', 'Due date', 'Status'];
        $rows    = [];

        foreach ($insight->invoices() as $invoice) {
            $rows[] = [
                (string) ($invoice['id'] ?? ''),
                trim((string) ($invoice['first_name'] ?? '') . ' ' . (string) ($invoice['last_name'] ?? '')),
                (string) ($invoice['admission_number'] ?? ''),
                (string) ($invoice['fee_head'] ?? ''),
                (string) ($invoice['amount'] ?? ''),
                (string) ($invoice['paid_total'] ?? '0'),
                (string) ($invoice['due_date'] ?? ''),
                (string) ($invoice['status'] ?? ''),
            ];
        }

        return [$columns, $rows];
    }

    /**
     * @return array{0:list<string>,1:list<list<string>>}
     */
    private function attendanceRows(SchoolInsightService $insight): array
    {
        $columns = ['Date', 'Student', 'Admission number', 'Class', 'Status'];
        $rows    = [];

        foreach ($insight->register() as $student) {
            $rows[] = [
                date('Y-m-d'),
                trim((string) ($student['first_name'] ?? '') . ' ' . (string) ($student['last_name'] ?? '')),
                (string) ($student['admission_number'] ?? ''),
                (string) ($student['class_name'] ?? ''),
                (string) ($student['today_status'] ?? 'not marked'),
            ];
        }

        return [$columns, $rows];
    }

    /**
     * @return list<array<string, string>>
     */
    private function idCardRows(SchoolInsightService $insight): array
    {
        $rows = [];

        foreach ($insight->students(60) as $student) {
            $rows[] = [
                'name'    => trim((string) ($student['first_name'] ?? '') . ' ' . (string) ($student['last_name'] ?? '')),
                'id'      => (string) ($student['admission_number'] ?? ''),
                'class'   => trim((string) ($student['class_name'] ?? '') . ' ' . (string) ($student['section_name'] ?? '')),
                'detail'  => (string) ($student['date_of_birth'] ?? ''),
            ];
        }

        return $rows;
    }

    /**
     * @return list<array<string, string>>
     */
    private function resultRows(SchoolInsightService $insight): array
    {
        $rows = [];

        foreach ($insight->marks() as $mark) {
            $max = (float) ($mark['max_marks'] ?? 0);
            $got = (float) ($mark['marks_obtained'] ?? 0);

            $rows[] = [
                'name'   => trim((string) ($mark['first_name'] ?? '') . ' ' . (string) ($mark['last_name'] ?? '')),
                'id'     => (string) ($mark['admission_number'] ?? ''),
                'class'  => (string) ($mark['exam_name'] ?? ''),
                'detail' => ($max > 0 ? number_format($got, 2) . ' / ' . number_format($max, 2) : (string) $got),
            ];
        }

        return $rows;
    }

    /**
     * @return list<array<string, string>>
     */
    private function receiptRows(SchoolInsightService $insight): array
    {
        $rows = [];

        foreach ($insight->receipts() as $receipt) {
            $rows[] = [
                'name'   => trim((string) ($receipt['first_name'] ?? '') . ' ' . (string) ($receipt['last_name'] ?? '')),
                'id'     => (string) ($receipt['receipt_number'] ?? ''),
                'class'  => (string) ($receipt['fee_head'] ?? ''),
                'detail' => (string) ($receipt['payment_mode'] ?? '') . ' · ' . (string) ($receipt['paid_at'] ?? ''),
            ];
        }

        return $rows;
    }

    /**
     * @return list<array<string, string>>
     */
    private function teacherRows(SchoolInsightService $insight): array
    {
        $rows = [];

        foreach ($insight->staff() as $member) {
            $rows[] = [
                'name'   => trim((string) ($member['first_name'] ?? '') . ' ' . (string) ($member['last_name'] ?? '')),
                'id'     => (string) ($member['employee_id'] ?? ''),
                'class'  => (string) ($member['role_type'] ?? ''),
                'detail' => (string) ($member['status'] ?? ''),
            ];
        }

        return $rows;
    }

    /* ------------------------------------------------------------- UTILS */

    /**
     * Build a CSV document from columns and rows.
     *
     * @param list<string>       $columns
     * @param list<list<string>> $rows
     */
    private function toCsv(array $columns, array $rows): string
    {
        $handle = fopen('php://temp', 'r+');

        if ($handle === false) {
            return '';
        }

        fputcsv($handle, $columns);

        foreach ($rows as $row) {
            fputcsv($handle, array_map(static fn ($cell) => (string) $cell, $row));
        }

        rewind($handle);
        $csv = (string) stream_get_contents($handle);
        fclose($handle);

        return $csv;
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

        return new SchoolInsightService(
            $access->connectionForSchoolId((int) $school->id),
            (int) $school->id,
            $userId
        );
    }

    private function failure(string $message, int $status)
    {
        return $this->response
            ->setStatusCode($status)
            ->setJSON(['ok' => false, 'message' => $message]);
    }
}
