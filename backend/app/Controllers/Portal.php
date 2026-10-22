<?php

namespace App\Controllers;

use App\Libraries\BillingService;
use App\Libraries\LicenseService;
use App\Libraries\PlatformService;
use App\Models\SchoolsModel;

/**
 * Platform (Super Admin) portal.
 *
 * SERVES THE APPROVED UI.
 *
 * The three reference HTML files under
 * zee_education_multi_agent_handoff/reference_ui are the visual authority
 * and are permanently read-only. They are NEVER modified.
 *
 * Instead, this controller works on a SEPARATE runtime copy
 * (app/Views/portal/superadmin.html) that is byte-for-byte the approved
 * design except for the hard-coded demo data replaced by __ZEE_* tokens,
 * which are filled with REAL control-plane data at render time.
 *
 * Nothing else about the design is touched - no colour, typography,
 * spacing, radius, chart, icon, animation, layout, breakpoint, DOM order,
 * class, id, navigation or visible text is altered.
 *
 * ACCESS: Super Admin only. The Super Admin sees platform records
 * (schools, installations, commercial). It does not browse learner data.
 */
class Portal extends BaseController
{
    /** GET /portal */
    public function index(): string
    {
        $payload = $this->portalPayload();

        $html = (string) file_get_contents(APPPATH . 'Views/portal/superadmin.html');

        // Replace every __ZEE_*__ token. Each token must exist in the template.
        foreach ($payload as $token => $value) {
            $placeholder = '__' . $token . '__';
            if (strpos($html, $placeholder) === false) {
                throw new \RuntimeException("Portal template token {$placeholder} missing");
            }
            $html = str_replace($placeholder, (string) $value, $html);
        }

        return $this->withWriteClient($html);
    }

    /**
     * Assemble all data needed by the approved Super Admin UI.
     */
    private function portalPayload(): array
    {
        $licenses = service('licenses');
        $billing  = service('billing');
        $platform = new PlatformService();

        return [
            'ZEE_SCHOOLS'         => json_encode(
                $this->schoolPayload($licenses, $billing),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_STATS'           => json_encode(
                $this->statsPayload($licenses, $billing),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_RENEWALS'        => json_encode(
                $this->renewalsPayload($licenses, $billing),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_INSTALL_HEALTH'  => json_encode(
                $this->installHealthPayload(),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_RATEBOOK'        => json_encode(
                $platform->rateBook(),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_SCHOOL_OPTIONS'  => json_encode(
                $this->schoolOptionsPayload(),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_TICKETS'         => json_encode(
                $this->ticketsPayload($platform),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_TICKET_COUNT'    => json_encode(
                (string) count($platform->tickets()),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_PLATFORM_TREND'  => json_encode(
                $this->platformTrendPayload($billing),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_OPERATIONS'      => json_encode(
                $platform->operations(),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_REMINDER_LOG'    => json_encode(
                $platform->reminderLog(),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_TEMPLATE_REQUESTS' => json_encode(
                $platform->templateRequests(),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_USER'            => json_encode(
                $this->userPayload(),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_THEME'           => json_encode(
                [
                    'primary'   => (string) $platform->setting('theme_primary', '#3558c8'),
                    'secondary' => (string) $platform->setting('theme_secondary', '#1b2a6b'),
                ],
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
        ];
    }

    /**
     * School table for the "Schools" tab.
     *
     * Columns expected by the approved design:
     *   name, city, domain, plan, database, status, renewal, colour
     * and, last, the record id - which the licence action needs and the table
     * never displays.
     *
     * @return list<list<string>>
     */
    private function schoolPayload(LicenseService $licenses, BillingService $billing): array
    {
        $rows = [];

        try {
            $model = new SchoolsModel();

            foreach ($model->findAll() as $school) {
                $state = (string) ($school->installation_state ?? 'requested');

                // Map the real provisioning state onto the approved status labels.
                $status = match ($state) {
                    'completed' => 'Active',
                    'failed'    => 'Provisioning',
                    default     => 'Provisioning',
                };

                $city    = (string) ($school->address ?? '');
                $domain  = (string) ($school->branding_reference ?? '');
                $renewal = '-';

                $license = $licenses->currentForSchool((int) $school->id);
                if ($license !== null && ! empty($license->expires_at)) {
                    $renewal = date('d M Y', strtotime((string) $license->expires_at));
                }

                $planName = '-';
                if ($license !== null) {
                    $plan = \Config\Database::connect()->table('license_plans')->where('id', $license->plan_id)->get()->getRow();
                    if ($plan !== null) {
                        $planName = $plan->name;
                    }
                }

                $rows[] = [
                    (string) ($school->name ?? 'Unnamed school'),
                    $city !== '' ? $city : '-',
                    $domain !== '' ? $domain : '-',
                    $planName,
                    'Dedicated',
                    $status,
                    $renewal,
                    '#3b82f6',
                    (int) ($school->id ?? 0),
                ];
            }
        } catch (\Throwable $e) {
            // A fresh, un-migrated control plane must still render the design.
            log_message('error', 'Portal::schoolPayload could not read schools: ' . $e->getMessage());
        }

        return $rows;
    }

    /**
     * Four stat cards for the dashboard header.
     *
     * @return list<list<string>>
     */
    private function statsPayload(LicenseService $licenses, BillingService $billing): array
    {
        $db = \Config\Database::connect();

        // Total schools
        $totalSchools = (new SchoolsModel())->countAllResults();

        // Active licences
        $activeLicences = $db->table('school_licenses')
            ->where('status', LicenseService::STATUS_ACTIVE)
            ->countAllResults();

        // Provisioning schools
        $provisioning = $db->table('schools')
            ->where('installation_state !=', 'completed')
            ->countAllResults();

        // Schools provisioned in the last 30 days
        $newThisMonth = $db->table('schools')
            ->where('provisioned_at >=', date('Y-m-d', strtotime('-30 days')))
            ->countAllResults();

        // Upcoming renewals
        $upcoming = $billing->upcomingRenewals(LicenseService::RENEWAL_WINDOW_DAYS);
        $upcomingCount = count($upcoming);

        // Next renewal date
        $nextRenewal = '-';
        if (! empty($upcoming)) {
            $nextRenewal = date('d M Y', strtotime($upcoming[0]->expires_at));
        }

        // Due soon count (within 7 days)
        $dueSoon = 0;
        foreach ($upcoming as $r) {
            $daysLeft = (int) floor((strtotime((string) $r->expires_at) - strtotime(date('Y-m-d'))) / 86400);
            if ($daysLeft <= 7 && $daysLeft >= 0) {
                $dueSoon++;
            }
        }

        // Revenue
        $summary = $billing->summary();
        $revenue = $this->formatCurrency($summary['revenue_collected']);

        // Revenue change vs previous period
        $revenueChange = $this->revenueChange($billing);

        // Tickets
        $tickets = $this->ticketsPayload(new PlatformService());
        $ticketCount = count($tickets);

        // Waiting tickets (high/urgent priority)
        $waiting = 0;
        foreach ($tickets as $t) {
            if (in_array($t[3] ?? '', ['High', 'Urgent'], true)) {
                $waiting++;
            }
        }

        return [
            ['▦', 'Total school installs', (string) $totalSchools,
             "{$activeLicences} active · {$provisioning} provisioning",
             "+{$newThisMonth} this month", '#fff'],
            ['◷', 'Upcoming renewals', (string) $upcomingCount,
             "next: {$nextRenewal}",
             "{$dueSoon} due soon", '#f59e0b'],
            ['₨', 'Licensed revenue', $revenue,
             'current billing period',
             $revenueChange, '#10b981'],
            ['☏', 'Open support tickets', (string) $ticketCount,
             "across {$totalSchools} school installs",
             "{$waiting} waiting", '#ec4899'],
        ];
    }

    /**
     * "Renewals needing attention" list.
     *
     * @return list<list<string>>
     */
    private function renewalsPayload(LicenseService $licenses, BillingService $billing): array
    {
        $rows = $billing->upcomingRenewals(LicenseService::RENEWAL_WINDOW_DAYS);
        $out  = [];

        foreach ($rows as $r) {
            $state = $licenses->state((int) $r->school_id);

            $daysLeft = (int) floor((strtotime((string) $r->expires_at) - strtotime(date('Y-m-d'))) / 86400);

            $color = match ($state['state']) {
                LicenseService::STATUS_GRACE       => '#f59e0b',
                LicenseService::STATUS_RENEWAL_DUE => '#8b5cf6',
                LicenseService::STATUS_ACTIVE      => '#10b981',
                default                            => '#6b7280',
            };

            $planLabel = $r->plan_name ?? 'No plan';
            $amount    = $this->planFee($r->plan_id ?? null);
            $planDisplay = $amount !== '' ? "{$planLabel} · PKR {$amount}" : $planLabel;

            $daysDisplay = $daysLeft >= 0 ? "{$daysLeft}d" : 'overdue';

            $out[] = [
                $r->school_name ?? 'Unnamed school',
                $planDisplay,
                $daysDisplay,
                $color,
            ];
        }

        return $out;
    }

    /**
     * "Install lifecycle" sub-heading: the school name.
     */
    private function installHealthPayload(): string
    {
        $db = \Config\Database::connect();
        $row = $db->table('schools')
            ->where('installation_state', 'completed')
            ->orderBy('provisioned_at', 'DESC')
            ->get()
            ->getRow();

        if ($row === null) {
            return 'No schools yet';
        }

        return htmlspecialchars((string) ($row->name ?? 'Unnamed school'), ENT_QUOTES, 'UTF-8');
    }

    /**
     * Installations and renewal collection per month, for the last 6 months.
     *
     * Both series are read from the control plane: the number of schools that
     * were provisioned in the month, and the licence revenue that was
     * collected in the month.
     *
     * @return list<array{0:string,1:int,2:float}>
     */
    private function platformTrendPayload(BillingService $billing): array
    {
        $db = \Config\Database::connect();
        $out = [];

        for ($i = 5; $i >= 0; $i--) {
            $start = date('Y-m-01', strtotime('-' . $i . ' months'));
            $end   = date('Y-m-t 23:59:59', strtotime($start));

            $installs = 0;

            try {
                $installs = (int) $db->table('schools')
                    ->where('provisioned_at >=', $start)
                    ->where('provisioned_at <=', $end)
                    ->countAllResults();
            } catch (\Throwable $e) {
                log_message('error', 'Portal::platformTrendPayload: ' . $e->getMessage());
            }

            $collected = (float) $billing->revenueForPeriod($start, $end);

            $out[] = [date('M', strtotime($start)), $installs, $collected];
        }

        return $out;
    }

    /**
     * The signed-in platform operator, for the workspace identity.
     *
     * @return array{name:string,initials:string}
     */
    private function userPayload(): array
    {
        $name = 'there';

        try {
            if (auth()->loggedIn()) {
                $name = trim((string) (auth()->user()->username ?? ''));

                if ($name === '') {
                    $name = trim((string) (auth()->user()->email ?? ''));
                }

                if ($name !== '') {
                    $name = ucwords(strtolower($name));
                }
            }
        } catch (\Throwable $e) {
            log_message('error', 'Portal::userPayload: ' . $e->getMessage());
        }

        if ($name === '') {
            $name = 'there';
        }

        $initials = '';

        foreach (preg_split('/\s+/', $name) ?: [] as $part) {
            if ($part === '') {
                continue;
            }

            $initials .= mb_strtoupper(mb_substr($part, 0, 1));

            if (mb_strlen($initials) === 2) {
                break;
            }
        }

        return ['name' => $name, 'initials' => $initials !== '' ? $initials : '—'];
    }

    /**
     * School names for the "Renewal reminder" dropdown.
     */
    private function schoolOptionsPayload(): string
    {
        $schools = (new SchoolsModel())->findAll();
        $options = '';

        foreach ($schools as $school) {
            $name = htmlspecialchars((string) ($school->name ?? 'Unnamed school'), ENT_QUOTES, 'UTF-8');
            $options .= "<option>{$name}</option>";
        }

        return $options;
    }

    /**
     * Support ticket list (latest 6).
     *
     * @return list<list<string>>
     */
    private function ticketsPayload(PlatformService $platform): array
    {
        $out = [];

        foreach (array_slice($platform->tickets(), 0, 6) as $ticket) {
            $out[] = [
                (string) ($ticket['ticket_no'] ?? ''),
                (string) ($ticket['school_name'] ?? 'Platform level'),
                (string) ($ticket['subject'] ?? ''),
                (string) ($ticket['priority'] ?? 'Normal'),
                (string) ($ticket['status'] ?? 'new'),
                $this->since((string) ($ticket['created_at'] ?? '')),
            ];
        }

        return $out;
    }

    /**
     * A short "3 days ago" style label for a platform timestamp.
     */
    private function since(string $timestamp): string
    {
        $timestamp = trim($timestamp);

        if ($timestamp === '' || str_starts_with($timestamp, '0000-00-00')) {
            return '—';
        }

        $time = strtotime($timestamp);

        if ($time === false) {
            return '—';
        }

        $diff = time() - $time;

        if ($diff < 60) {
            return 'just now';
        }

        if ($diff < 3600) {
            $minutes = (int) floor($diff / 60);

            return $minutes . ' min ago';
        }

        if ($diff < 86400) {
            $hours = (int) floor($diff / 3600);

            return $hours . ' hour' . ($hours === 1 ? '' : 's') . ' ago';
        }

        if ($diff < 2592000) {
            $days = (int) floor($diff / 86400);

            return $days . ' day' . ($days === 1 ? '' : 's') . ' ago';
        }

        return date('d M Y', $time);
    }

    // -----------------------------------------------------------------
    // internals
    // -----------------------------------------------------------------

    private function formatCurrency(string $amount): string
    {
        $num = (float) $amount;
        if ($num >= 1000000) {
            return 'PKR ' . number_format($num / 1000000, 2) . 'M';
        }
        return 'PKR ' . number_format($num, 0, '.', '');
    }

    private function revenueChange(BillingService $billing): string
    {
        try {
            $now       = date('Y-m-d H:i:s');
            $oneYear   = date('Y-m-d H:i:s', strtotime('-365 days', strtotime($now)));
            $twoYears  = date('Y-m-d H:i:s', strtotime('-730 days', strtotime($now)));

            $current  = (float) $billing->revenueForPeriod($oneYear);
            $previous = (float) $billing->revenueForPeriod($twoYears, $oneYear);

            if ($previous <= 0) {
                return $current > 0 ? 'new this period' : 'no revenue yet';
            }

            $pct  = (($current - $previous) / $previous) * 100;
            $sign = $pct >= 0 ? '+' : '';

            return "{$sign}" . number_format($pct, 1) . '%';
        } catch (\Throwable $e) {
            log_message('error', 'Portal::revenueChange: ' . $e->getMessage());
            return 'this period';
        }
    }

    private function planFee(?int $planId): string
    {
        if ($planId === null || $planId === 0) {
            return '';
        }
        $plan = \Config\Database::connect()->table('license_plans')->where('id', $planId)->get()->getRow();
        return $plan === null ? '' : number_format((float) $plan->annual_fee, 0, '.', '');
    }
}