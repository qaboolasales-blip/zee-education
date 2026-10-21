<?php

namespace App\Controllers;

use App\Libraries\BillingService;
use App\Libraries\LicenseService;
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

        return $html;
    }

    /**
     * Assemble all data needed by the approved Super Admin UI.
     */
    private function portalPayload(): array
    {
        $licenses = service('licenses');
        $billing  = service('billing');

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
                $this->rateBookPayload($licenses, $billing),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_SCHOOL_OPTIONS'  => json_encode(
                $this->schoolOptionsPayload(),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_TICKETS'         => json_encode(
                $this->ticketsPayload(),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'ZEE_TICKET_COUNT'    => json_encode(
                (string) count($this->ticketsPayload()),
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
        ];
    }

    /**
     * School table for the "Schools" tab.
     *
     * Columns expected by the approved design:
     *   name, city, domain, plan, database, status, renewal, colour
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
        $tickets = $this->ticketsPayload();
        $ticketCount = count($tickets);

        // Waiting tickets (high/urgent priority)
        $waiting = 0;
        foreach ($tickets as $t) {
            if (in_array($t[3] ?? '', ['High', 'Urgent'], true)) {
                $waiting++;
            }
        }

        return [
            ['\u{25A6}', 'Total school installs', (string) $totalSchools,
             "{$activeLicences} active \u{00B7} {$provisioning} provisioning",
             "+{$newThisMonth} this month", '#fff'],
            ['\u{25F7}', 'Upcoming renewals', (string) $upcomingCount,
             "next: {$nextRenewal}",
             "{$dueSoon} due soon", '#f59e0b'],
            ['\u{20A8}', 'Licensed revenue', $revenue,
             'current billing period',
             $revenueChange, '#10b981'],
            ['\u{260F}', 'Open support tickets', (string) $ticketCount,
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
            $planDisplay = $amount !== '' ? "{$planLabel} \u{00B7} PKR {$amount}" : $planLabel;

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
     * Billing "School rate book" table.
     *
     * @return list<list<string>>
     */
    private function rateBookPayload(LicenseService $licenses, BillingService $billing): array
    {
        $db      = \Config\Database::connect();
        $schools = (new SchoolsModel())->findAll();
        $out     = [];

        foreach ($schools as $school) {
            $license = $licenses->currentForSchool((int) $school->id);
            $planName = '-';
            $fee      = '-';

            if ($license !== null) {
                $plan = $db->table('license_plans')->where('id', $license->plan_id)->get()->getRow();
                if ($plan !== null) {
                    $planName = $plan->name;
                    $fee      = number_format((float) $plan->annual_fee, 0, '.', '');
                }
            }

            $out[] = [
                $school->name ?? 'Unnamed school',
                $planName,
                $fee,
            ];
        }

        return $out;
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
     * Support ticket list (latest 4).
     *
     * @return list<list<string>>
     */
    private function ticketsPayload(): array
    {
        try {
            $db = \Config\Database::connect();

            if (! $db->tableExists('support_tickets')) {
                return [];
            }

            $rows = $db->table('support_tickets')
                ->join('schools', 'schools.id = support_tickets.school_id', 'left')
                ->orderBy('support_tickets.id', 'DESC')
                ->limit(4)
                ->get()
                ->getResultArray();

            $out = [];
            foreach ($rows as $r) {
                $out[] = [
                    $r->ticket_no ?? ('ZE-' . $r->id),
                    $r->school_name ?? 'Unknown',
                    $r->subject ?? '',
                    $r->priority ?? 'Normal',
                    $r->created_at ? date('d M Y', strtotime($r->created_at)) : '-',
                ];
            }

            return $out;
        } catch (\Throwable $e) {
            log_message('error', 'Portal::ticketsPayload: ' . $e->getMessage());
            return [];
        }
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