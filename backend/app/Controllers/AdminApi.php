<?php

namespace App\Controllers;

use App\Libraries\PlatformService;
use App\Libraries\SchoolProvisioningService;
use App\Models\SchoolsModel;

/**
 * Super Admin platform API.
 *
 * This is the endpoint documented as POST /admin/schools/provision, which
 * previously existed in the documentation but had no route or implementation.
 *
 * It also carries the platform records the Super Admin workspace owns and
 * could previously only fake: support tickets, the negotiated rate book, the
 * platform operation switches and the renewal reminder log.
 *
 * SECURITY CONTRACT:
 *  - Super Admin only (platform operator, not a school user).
 *  - No database credentials are ever accepted from the request. The school
 *    database mapping comes from server-local configuration only (ADR-108).
 *  - The school code is validated against a strict allow-list and is used only
 *    to look up a mapping; it is never concatenated into SQL.
 *  - State-changing requests are covered by the global CSRF filter, which
 *    answers a refusal with a JSON 403 rather than an HTML error page.
 */
class AdminApi extends BaseController
{
    /** GET /api/admin/schools */
    public function schools()
    {
        try {
            $model = new SchoolsModel();

            return $this->json([
                'ok'      => true,
                'schools' => $model->findAll(),
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'AdminApi::schools: ' . $e->getMessage());

            return $this->json(['ok' => false, 'message' => 'Could not read schools'], 500);
        }
    }

    /**
     * POST /admin/schools  create a school record
     * POST /admin/schools/provision  create AND provision it
     */
    public function provision()
    {
        $in   = $this->body();
        $name = trim((string) ($in['name'] ?? ''));
        $code = strtolower(trim((string) ($in['school_code'] ?? '')));

        if ($name === '') {
            return $this->json(['ok' => false, 'message' => 'School name is required'], 422);
        }

        if (preg_match('/^[a-z0-9]{3,20}$/', $code) !== 1) {
            return $this->json([
                'ok'      => false,
                'message' => 'School code must be 3-20 lowercase letters or digits',
            ], 422);
        }

        try {
            $model = new SchoolsModel();

            $existing = $model->where('school_code', $code)->first();

            if ($existing !== null) {
                return $this->json([
                    'ok'      => false,
                    'message' => 'That school code is already in use',
                    'id'      => (int) $existing->id,
                ], 409);
            }

            $id = $model->insert([
                'name'               => $name,
                'status'             => 'active',
                'school_code'        => $code,
                'plan_code'          => trim((string) ($in['plan_code'] ?? '')) ?: null,
                'timezone'           => trim((string) ($in['timezone'] ?? 'Asia/Karachi')),
                'currency'           => trim((string) ($in['currency'] ?? 'PKR')),
                'contact_email'      => trim((string) ($in['contact_email'] ?? '')) ?: null,
                'contact_phone'      => trim((string) ($in['contact_phone'] ?? '')) ?: null,
                'address'            => trim((string) ($in['address'] ?? '')) ?: null,
                'installation_state' => SchoolProvisioningService::STATE_REQUESTED,
                'installation_status' => SchoolProvisioningService::STATE_REQUESTED,
            ]);

            $service = new SchoolProvisioningService();
            $result  = $service->provisionSchool((int) $id, []);

            return $this->json([
                'ok'      => $result['success'] === true,
                'school'  => ['id' => (int) $id, 'name' => $name, 'school_code' => $code],
                'state'   => $model->find($id)->installation_state,
                'message' => $result['success'] === true
                    ? 'School created and provisioned'
                    : ($result['error'] ?? 'Provisioning could not finish'),
                'database' => $result['database'] ?? null,
            ], $result['success'] === true ? 201 : 200);
        } catch (\Throwable $e) {
            log_message('error', 'AdminApi::provision: ' . $e->getMessage());

            return $this->json(['ok' => false, 'message' => 'Provisioning failed; see the server log'], 500);
        }
    }

    /** GET /api/admin/tickets */
    public function tickets()
    {
        $platform = new PlatformService();

        return $this->json([
            'ok'      => true,
            'tickets' => $platform->tickets(),
        ]);
    }

    /** POST /api/admin/tickets */
    public function createTicket()
    {
        $platform = new PlatformService();

        $result = $platform->createTicket($this->body());

        return $this->json($result, $result['ok'] === true ? 201 : 422);
    }

    /** GET /api/admin/ratebook */
    public function ratebook()
    {
        $platform = new PlatformService();

        return $this->json([
            'ok'       => true,
            'ratebook' => $platform->rateBook(),
        ]);
    }

    /** POST /api/admin/ratebook */
    public function saveRate()
    {
        $in      = $this->body();
        $schoolId = (int) ($in['school_id'] ?? 0);
        $fee      = (float) ($in['annual_fee'] ?? 0);

        $platform = new PlatformService();

        if ($platform->saveRate($schoolId, $fee) === false) {
            return $this->json([
                'ok'      => false,
                'message' => 'The negotiated fee could not be saved',
            ], 422);
        }

        return $this->json([
            'ok'        => true,
            'message'   => 'Rate saved',
            'ratebook'  => $platform->rateBook(),
        ]);
    }

    /** GET /api/admin/settings */
    public function settings()
    {
        $platform = new PlatformService();

        return $this->json([
            'ok'         => true,
            'operations' => $platform->operations(),
            'reminders'  => $platform->reminderLog(),
        ]);
    }

    /** POST /api/admin/settings */
    public function saveSettings()
    {
        $in       = $this->body();
        $platform = new PlatformService();
        $saved    = 0;

        foreach (PlatformService::OPERATION_KEYS as $key) {
            if (! array_key_exists($key, $in)) {
                continue;
            }

            $value = filter_var($in[$key], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

            if ($value === null) {
                continue;
            }

            if ($platform->setSetting($key, $value ? '1' : '0')) {
                $saved++;
            }
        }

        // The workspace theme is a platform preference, not a school one.
        foreach (['theme_primary', 'theme_secondary'] as $key) {
            if (! array_key_exists($key, $in)) {
                continue;
            }

            $value = trim((string) $in[$key]);

            if ($value === '' || preg_match('/^#[0-9a-fA-F]{3,8}$/', $value) !== 1) {
                continue;
            }

            if ($platform->setSetting($key, $value)) {
                $saved++;
            }
        }

        if ($saved === 0) {
            return $this->json([
                'ok'      => false,
                'message' => 'No valid setting was supplied',
            ], 422);
        }

        return $this->json([
            'ok'         => true,
            'message'    => 'Platform settings saved',
            'operations' => $platform->operations(),
        ]);
    }

    /** GET /api/admin/reminders */
    public function reminders()
    {
        $platform = new PlatformService();

        return $this->json([
            'ok'        => true,
            'reminders' => $platform->reminderLog(),
        ]);
    }

    /** POST /api/admin/reminders */
    public function createReminder()
    {
        $in       = $this->body();
        $platform = new PlatformService();

        $result = $platform->recordReminder(
            (string) ($in['school'] ?? ''),
            (string) ($in['note'] ?? '')
        );

        return $this->json($result, $result['ok'] === true ? 201 : 422);
    }

    /** GET /api/admin/quotes */
    public function quotes()
    {
        $platform = new PlatformService();

        return $this->json([
            'ok'     => true,
            'quotes' => $platform->quotes(),
        ]);
    }

    /** POST /api/admin/quotes */
    public function saveQuote()
    {
        $platform = new PlatformService();

        $result = $platform->saveQuote($this->body());

        return $this->json($result, $result['ok'] === true ? 200 : 422);
    }

    /** GET /api/admin/installations */
    public function installations()
    {
        $platform = new PlatformService();

        return $this->json([
            'ok'            => true,
            'installations' => $platform->installationHealth(),
        ]);
    }

    /** GET /api/admin/template-requests */
    public function templateRequests()
    {
        $platform = new PlatformService();

        return $this->json([
            'ok'      => true,
            'requests' => $platform->templateRequests(),
        ]);
    }

    /**
     * GET /api/admin/export/{kind}
     *
     * A real CSV of the platform's own control-plane rows. No learner data is
     * ever exported here: the platform holds installations, commercial
     * records and support tickets, never student records.
     */
    public function export(string $kind = 'schools')
    {
        $kind    = strtolower($kind);
        $platform = new PlatformService();

        [$columns, $rows, $name] = match ($kind) {
            'tickets'  => $this->ticketRows($platform),
            'ratebook' => $this->rateBookRows($platform),
            'renewals' => $this->renewalRows(),
            default    => $this->schoolRows(),
        };

        $body = $this->toCsv($columns, $rows);

        return $this->response
            ->setStatusCode(200)
            ->setHeader('Content-Type', 'text/csv; charset=utf-8')
            ->setHeader('Content-Disposition', 'attachment; filename="zee-platform-' . $name . '-' . date('Y-m-d') . '.csv"')
            ->setHeader('Cache-Control', 'no-store')
            ->setBody($body);
    }

    /**
     * GET /api/admin/print/{template}
     *
     * A real printable specimen of a built-in school document. It contains no
     * learner data - only the approved field layout of the template.
     */
    public function print(string $template = 'admission')
    {
        $template = strtolower($template);

        if (! isset(self::TEMPLATES[$template])) {
            return $this->json(['ok' => false, 'message' => 'That print template does not exist'], 404);
        }

        $data = [
            'title'     => self::TEMPLATES[$template]['name'],
            'kind'      => $template,
            'school'    => 'Any school installation',
            'primary'   => '#3558c8',
            'secondary' => '#1b2a6b',
            'printed'   => date('d M Y, H:i'),
            'fields'    => self::TEMPLATES[$template]['fields'],
        ];

        $html = view('portal/platform-print', ['data' => $data]);

        return $this->response
            ->setStatusCode(200)
            ->setHeader('Content-Type', 'text/html; charset=utf-8')
            ->setHeader('Cache-Control', 'no-store')
            ->setBody($html);
    }

    /* ------------------------------------------------------------- ROWS */

    /**
     * The built-in school documents the platform can preview.
     *
     * @var array<string, array{name:string,fields:list<array<string,mixed>>}>
     */
    private const TEMPLATES = [
        'admission' => [
            'name'   => 'Admission form',
            'fields' => [
                ['label' => 'Student name', 'wide' => true],
                ['label' => 'Admission number'],
                ['label' => 'Date of birth'],
                ['label' => 'Class'],
                ['label' => 'Section'],
                ['label' => 'Gender'],
                ['label' => 'Guardian name', 'wide' => true],
                ['label' => 'Guardian phone', 'wide' => true],
            ],
        ],
        'teacher' => [
            'name'   => 'Teacher form',
            'fields' => [
                ['label' => 'Teacher name', 'wide' => true],
                ['label' => 'Employee ID'],
                ['label' => 'Role'],
                ['label' => 'Phone', 'wide' => true],
                ['label' => 'Address', 'wide' => true],
            ],
        ],
        'id-card' => [
            'name'   => 'Student ID card',
            'fields' => [
                ['label' => 'Student name', 'wide' => true],
                ['label' => 'Admission number'],
                ['label' => 'Class'],
                ['label' => 'Valid until', 'wide' => true],
            ],
        ],
        'result-card' => [
            'name'   => 'Result card',
            'fields' => [
                ['label' => 'Student name', 'wide' => true],
                ['label' => 'Assessment'],
                ['label' => 'Obtained / total'],
                ['label' => 'Result', 'wide' => true],
                ['label' => 'Teacher signature', 'wide' => true],
            ],
        ],
    ];

    /**
     * @return array{0:list<string>,1:list<list<string>>,2:string}
     */
    private function schoolRows(): array
    {
        $columns = ['School', 'Code', 'Domain', 'City', 'Plan', 'Status', 'Renewal'];
        $rows    = [];

        foreach ((new SchoolsModel())->findAll() as $school) {
            $license = service('licenses')->currentForSchool((int) $school->id);

            $plan    = '-';
            $renewal = '-';

            if ($license !== null) {
                $planRow = \Config\Database::connect()->table('license_plans')
                    ->where('id', $license->plan_id)->get()->getRow();

                $plan = $planRow === null ? '-' : (string) $planRow->name;

                if (! empty($license->expires_at)) {
                    $renewal = date('d M Y', strtotime((string) $license->expires_at));
                }
            }

            $rows[] = [
                (string) ($school->name ?? ''),
                (string) ($school->school_code ?? ''),
                (string) ($school->branding_reference ?? ''),
                (string) ($school->address ?? ''),
                $plan,
                (string) ($school->installation_state ?? ''),
                $renewal,
            ];
        }

        return [$columns, $rows, 'schools'];
    }

    /**
     * @return array{0:list<string>,1:list<list<string>>,2:string}
     */
    private function ticketRows(PlatformService $platform): array
    {
        $columns = ['Ticket', 'School', 'Subject', 'Priority', 'Status', 'Created'];
        $rows    = [];

        foreach ($platform->tickets() as $ticket) {
            $rows[] = [
                (string) ($ticket['ticket_no'] ?? ''),
                (string) ($ticket['school_name'] ?? ''),
                (string) ($ticket['subject'] ?? ''),
                (string) ($ticket['priority'] ?? ''),
                (string) ($ticket['status'] ?? ''),
                (string) ($ticket['created_at'] ?? ''),
            ];
        }

        return [$columns, $rows, 'tickets'];
    }

    /**
     * @return array{0:list<string>,1:list<list<string>>,2:string}
     */
    private function rateBookRows(PlatformService $platform): array
    {
        $columns = ['School', 'Plan', 'Annual fee', 'Add-ons'];
        $rows    = [];

        foreach ($platform->quotes() as $quote) {
            $rows[] = [
                (string) ($quote['school'] ?? ''),
                $this->planName((int) $quote['school_id']),
                (string) ($quote['annual_fee'] ?? ''),
                implode(' · ', (array) ($quote['addons'] ?? [])),
            ];
        }

        return [$columns, $rows, 'rate-book'];
    }

    /**
     * @return array{0:list<string>,1:list<list<string>>,2:string}
     */
    private function renewalRows(): array
    {
        $columns = ['School', 'Plan', 'Expires on', 'Days left'];
        $rows    = [];

        foreach (service('billing')->upcomingRenewals(120) as $renewal) {
            $daysLeft = (int) floor((strtotime((string) $renewal->expires_at) - strtotime(date('Y-m-d'))) / 86400);

            $rows[] = [
                (string) ($renewal->school_name ?? ''),
                (string) ($renewal->plan_name ?? ''),
                date('d M Y', strtotime((string) $renewal->expires_at)),
                (string) $daysLeft,
            ];
        }

        return [$columns, $rows, 'renewals'];
    }

    private function planName(int $schoolId): string
    {
        $license = service('licenses')->currentForSchool($schoolId);

        if ($license === null) {
            return '-';
        }

        $plan = \Config\Database::connect()->table('license_plans')
            ->where('id', $license->plan_id)->get()->getRow();

        return $plan === null ? '-' : (string) $plan->name;
    }

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
