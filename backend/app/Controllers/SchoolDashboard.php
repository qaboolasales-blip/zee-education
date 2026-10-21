<?php

namespace App\Controllers;

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
        $data = $this->collect();

        $html = (string) file_get_contents(APPPATH . 'Views/portal/school.html');

        if (strpos($html, '__ZEE_SCHOOL_STATS__') === false) {
            throw new \RuntimeException('School dashboard template token missing');
        }

        $html = str_replace('__ZEE_SCHOOL_STATS__', $this->encode($data['stats']), $html);
        $html = str_replace('__ZEE_SCHOOL_NAME__', $this->encodeText($data['schoolName']), $html);
        $html = str_replace('__ZEE_SCHOOL_GREET__', $this->encodeText($data['greeting']), $html);

        $html = str_replace('__ZEE_STUDENTS__', $this->encode($data['students']), $html);
        $html = str_replace('__ZEE_ATTENDANCE__', $this->encode($data['register']), $html);
        $html = str_replace('__ZEE_FEES__', $this->encode($data['fees']), $html);
        $html = str_replace('__ZEE_FEE_TOTALS__', $this->encode($data['feeTotals']), $html);
        $html = str_replace('__ZEE_MARKS__', $this->encode($data['marks']), $html);
        $html = str_replace('__ZEE_ACTIVITY__', $this->encode($data['activity']), $html);
        $html = str_replace('__ZEE_STAFF__', $this->encode($data['staff']), $html);
        $html = str_replace('__ZEE_STUDENT_OPTIONS__', $this->encode($data['studentOptions']), $html);

        // Demo connection code shown on the Settings card.
        $html = str_replace(
            '__ZEE_SCHOOL_CODE__',
            $this->encodeText(strtoupper((string) ($data['schoolCode'] ?? '')) ?: '-'),
            $html
        );

        $html = str_replace(
            '__ZEE_SCHOOL_DOMAIN__',
            $this->encodeText((string) ($data['schoolDomain'] ?? '')),
            $html
        );

        return $html;
    }

    /**
     * Reads everything the approved sections need, from the school's own
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

        $conn = $school === null ? null : $access->connectionForSchoolId((int) $school->id);

        $out = [
            'schoolName'     => $school->name ?? 'Your School',
            'schoolCode'     => $school->school_code ?? '',
            'schoolDomain'   => $school->branding_reference ?? '',
            'greeting'       => $this->greetingName(),
            'stats'          => $this->stats($conn),
            'students'       => [],
            'register'       => [],
            'fees'           => [],
            'feeTotals'      => ['PKR 0', 'PKR 0', 'no invoices', '0'],
            'marks'          => [],
            'activity'       => [],
            'staff'          => [],
            'studentOptions' => '',
        ];

        if ($conn === null) {
            return $out;
        }

        try {
            if ($conn->tableExists('students')) {
                $students = $conn->table('students')->get()->getResultArray();

                foreach ($students as $s) {
                    $name = trim(($s['first_name'] ?? '') . ' ' . ($s['last_name'] ?? ''));
                    $adm  = (string) ($s['admission_number'] ?? '');

                    $out['students'][]   = [$name, $adm, '-', '-'];
                    $out['register'][]   = [$name, $adm];
                }

                $out['studentOptions'] = implode('', array_map(
                    static fn ($s) => '<option>' . esc(trim(($s['first_name'] ?? '') . ' ' . ($s['last_name'] ?? ''))) . '</option>',
                    $students
                ));
            }

            if ($conn->tableExists('staff')) {
                foreach ($conn->table('staff')->get()->getResultArray() as $s) {
                    $name = trim(($s['first_name'] ?? '') . ' ' . ($s['last_name'] ?? ''));

                    $out['staff'][] = [
                        $name,
                        (string) ($s['role_type'] ?? 'Staff'),
                        (string) ($s['employee_id'] ?? '-'),
                    ];
                }
            }

            if ($conn->tableExists('fee_invoices')) {
                foreach ($conn->table('fee_invoices')->get()->getResultArray() as $inv) {
                    $amount = (int) ($inv['amount'] ?? 0);
                    $status = ($inv['status'] ?? '') === 'paid' ? 'Paid' : 'Due';

                    $out['fees'][] = [
                        '#' . ($inv['id'] ?? ''),
                        'INV-' . ($inv['id'] ?? ''),
                        'PKR ' . number_format($amount),
                        '-',
                        $status,
                    ];
                }

                $out['feeTotals'] = $this->feeTotals($conn);
            }

            if ($conn->tableExists('marks_entries')) {
                foreach ($conn->table('marks_entries')->get()->getResultArray() as $m) {
                    $out['marks'][] = [
                        '#' . ($m['student_id'] ?? ''),
                        (string) ($m['marks_obtained'] ?? '-'),
                        '-',
                    ];
                }
            }
        } catch (\Throwable $e) {
            log_message('error', 'SchoolDashboard::collect: ' . $e->getMessage());
        }

        return $out;
    }

    /**
     * The five overview cards, in the approved design's shape:
     * [ icon, label, value, sub, trend, colour ]
     *
     * @return list<list<string>>
     */
    private function stats($conn): array
    {
        $zero = [
            ['&#9812;', 'Enrolled students', '0', 'no students yet', '-', '#3b82f6'],
            ['&#9823;', 'Active guardians', '0', 'linked accounts', '-', '#10b981'],
            ['&#9818;', 'Active staff', '0', 'staff records', '-', '#ec4899'],
            ['&#10003;', 'Attendance today', '-', 'not recorded', '-', '#f59e0b'],
            ['&#8368;', 'Fees collected', 'PKR 0', 'no invoices yet', '-', '#8b5cf6'],
        ];

        if ($conn === null) {
            return $zero;
        }

        try {
            if (! $conn->tableExists('students')) {
                return $zero;
            }

            $students = (int) $conn->table('students')->countAllResults();
            $guard    = $conn->tableExists('guardians') ? (int) $conn->table('guardians')->countAllResults() : 0;
            $staff    = $conn->tableExists('staff') ? (int) $conn->table('staff')->countAllResults() : 0;

            $collected = 0;

            if ($conn->tableExists('fee_receipts')) {
                $collected = (int) $conn->table('fee_receipts')->selectSum('amount_paid', 't')->get()->getRow('t');
            }

            return [
                ['&#9812;', 'Enrolled students', (string) $students, 'in this school', '-', '#3b82f6'],
                ['&#9823;', 'Active guardians', (string) $guard, 'linked accounts', '-', '#10b981'],
                ['&#9818;', 'Active staff', (string) $staff, 'staff records', '-', '#ec4899'],
                ['&#10003;', 'Attendance today', '-', 'not recorded', '-', '#f59e0b'],
                ['&#8368;', 'Fees collected', 'PKR ' . number_format($collected), 'received', '-', '#8b5cf6'],
            ];
        } catch (\Throwable $e) {
            log_message('error', 'SchoolDashboard::stats: ' . $e->getMessage());

            return $zero;
        }
    }

    /**
     * @return list<string>
     */
    private function feeTotals($conn): array
    {
        try {
            $billed = 0;
            $paid   = 0;

            if ($conn->tableExists('fee_invoices')) {
                $billed = (int) $conn->table('fee_invoices')->selectSum('amount', 't')->get()->getRow('t');
            }

            if ($conn->tableExists('fee_receipts')) {
                $paid = (int) $conn->table('fee_receipts')->selectSum('amount_paid', 't')->get()->getRow('t');
            }

            $open = max(0, $billed - $paid);
            $due  = 0;

            if ($conn->tableExists('fee_invoices')) {
                $due = (int) $conn->table('fee_invoices')
                    ->where('status !=', 'paid')
                    ->countAllResults();
            }

            return [
                'PKR ' . number_format($paid),
                'PKR ' . number_format($open),
                $due . ' invoices pending',
                (string) $due,
            ];
        } catch (\Throwable) {
            return ['PKR 0', 'PKR 0', 'no invoices', '0'];
        }
    }

    private function greetingName(): string
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

    private function encode(mixed $data): string
    {
        return (string) json_encode(
            $data,
            JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
        );
    }

    private function encodeText(string $text): string
    {
        return $this->encode($text);
    }
}