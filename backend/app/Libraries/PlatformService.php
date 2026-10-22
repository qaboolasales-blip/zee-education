<?php

namespace App\Libraries;

use App\Models\SchoolsModel;

/**
 * Platform (control-plane) records the Super Admin workspace owns.
 *
 * Three things live here:
 *  - support tickets (a platform record about an installation, never learner data)
 *  - platform settings (the workspace switches and the negotiated rate book)
 *  - the renewal reminder log
 *
 * All of it is stored on the CONTROL PLANE. This class never opens a school
 * database, so it can never surface learner data to a platform operator.
 */
class PlatformService
{
    /**
     * Settings that back the "Platform operations" switches.
     */
    public const OPERATION_KEYS = [
        'audit_trail',
        'backup_monitoring',
        'ticket_sla',
        'maintenance_notices',
    ];

    /**
     * The subject prefix a custom print-design request is stored under.
     */
    public const TEMPLATE_REQUEST_PREFIX = 'Custom print design:';

    /**
     * @return list<array<string, mixed>>
     */
    public function tickets(int $limit = 100): array
    {
        $db = \Config\Database::connect();

        if (! $db->tableExists('support_tickets')) {
            return [];
        }

        try {
            return $db->table('support_tickets')
                ->select('support_tickets.id, support_tickets.ticket_no, support_tickets.school_id, support_tickets.subject, support_tickets.priority, support_tickets.status, support_tickets.created_at, support_tickets.updated_at, schools.name AS school_name')
                ->join('schools', 'schools.id = support_tickets.school_id', 'left')
                ->orderBy('support_tickets.id', 'DESC')
                ->limit($limit)
                ->get()
                ->getResultArray();
        } catch (\Throwable $e) {
            log_message('error', 'PlatformService::tickets: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * Create a support ticket.
     *
     * @param array<string, mixed> $in
     *
     * @return array{ok:bool,message:string,ticket_no?:string,id?:int}
     */
    public function createTicket(array $in): array
    {
        $subject = trim((string) ($in['subject'] ?? ''));
        $body    = trim((string) ($in['body'] ?? ''));
        $school  = trim((string) ($in['school'] ?? ''));
        $priority = (string) ($in['priority'] ?? 'Normal');

        if ($subject === '') {
            return ['ok' => false, 'message' => 'Subject is required'];
        }

        if (! in_array($priority, ['Low', 'Normal', 'High', 'Urgent'], true)) {
            $priority = 'Normal';
        }

        $db = \Config\Database::connect();

        if (! $db->tableExists('support_tickets')) {
            return ['ok' => false, 'message' => 'Support tickets are not available on this installation'];
        }

        $schoolId = 0;

        if ($school !== '') {
            $row = $db->table('schools')->where('name', $school)->get()->getRow();

            if ($row === null) {
                return ['ok' => false, 'message' => 'No school installation matches that name'];
            }

            $schoolId = (int) $row->id;
        }

        $now      = date('Y-m-d H:i:s');
        $ticketNo = $this->nextTicketNumber($db);

        try {
            $db->table('support_tickets')->insert([
                'ticket_no'  => $ticketNo,
                'school_id'  => $schoolId > 0 ? $schoolId : null,
                'subject'    => $subject,
                'body'       => $body !== '' ? $body : null,
                'priority'   => $priority,
                'status'     => 'new',
                'created_by' => auth()->loggedIn() ? (int) auth()->id() : null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return [
                'ok'        => true,
                'message'   => 'Support ticket ' . $ticketNo . ' created',
                'ticket_no' => $ticketNo,
                'id'        => (int) $db->insertID(),
            ];
        } catch (\Throwable $e) {
            log_message('error', 'PlatformService::createTicket: ' . $e->getMessage());

            return ['ok' => false, 'message' => 'The ticket could not be saved'];
        }
    }

    /**
     * A ticket number that is not yet used.
     */
    private function nextTicketNumber($db): string
    {
        $series = (int) $db->table('support_tickets')
            ->like('ticket_no', 'ZE-' . date('ym'), 'after')
            ->countAllResults();

        for ($i = 0; $i < 100; $i++) {
            $candidate = 'ZE-' . date('ym') . '-' . str_pad((string) ($series + $i + 1), 4, '0', STR_PAD_LEFT);

            if ($db->table('support_tickets')->where('ticket_no', $candidate)->countAllResults() === 0) {
                return $candidate;
            }
        }

        return 'ZE-' . date('ymd-His');
    }

    /* --------------------------------------------------------- SETTINGS */

    /**
     * One platform setting, or $default.
     */
    public function setting(string $key, ?string $default = null): ?string
    {
        $db = \Config\Database::connect();

        if (! $db->tableExists('platform_settings')) {
            return $default;
        }

        try {
            $row = $db->table('platform_settings')->where('setting_key', $key)->get()->getRow();

            return $row === null ? $default : (string) $row->setting_value;
        } catch (\Throwable $e) {
            log_message('error', 'PlatformService::setting: ' . $e->getMessage());

            return $default;
        }
    }

    /**
     * Write one platform setting.
     */
    public function setSetting(string $key, string $value): bool
    {
        if ($key === '') {
            return false;
        }

        $db = \Config\Database::connect();

        if (! $db->tableExists('platform_settings')) {
            return false;
        }

        $now = date('Y-m-d H:i:s');

        try {
            $exists = $db->table('platform_settings')->where('setting_key', $key)->countAllResults();

            if ($exists > 0) {
                $db->table('platform_settings')->where('setting_key', $key)->update([
                    'setting_value' => $value,
                    'updated_by'    => auth()->loggedIn() ? (int) auth()->id() : null,
                    'updated_at'    => $now,
                ]);

                return true;
            }

            $db->table('platform_settings')->insert([
                'setting_key'   => $key,
                'setting_value' => $value,
                'updated_by'    => auth()->loggedIn() ? (int) auth()->id() : null,
                'created_at'    => $now,
                'updated_at'    => $now,
            ]);

            return true;
        } catch (\Throwable $e) {
            log_message('error', 'PlatformService::setSetting: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * The platform operation switches, with their stored state.
     *
     * @return array<string, bool>
     */
    public function operations(): array
    {
        $out = [];

        foreach (self::OPERATION_KEYS as $key) {
            $out[$key] = $this->setting($key, '1') === '1';
        }

        return $out;
    }

    /**
     * The negotiated rate book: one row per school installation.
     *
     * Each row is [ school name, plan name, annual fee, school id ].
     *
     * @return list<array<string, mixed>>
     */
    public function rateBook(): array
    {
        $db      = \Config\Database::connect();
        $schools = (new SchoolsModel())->findAll();
        $out     = [];

        foreach ($schools as $school) {
            $license = service('licenses')->currentForSchool((int) $school->id);

            $planName = '-';
            $fee      = '-';

            if ($license !== null) {
                $plan = $db->table('license_plans')->where('id', $license->plan_id)->get()->getRow();

                if ($plan !== null) {
                    $planName = (string) $plan->name;
                    $fee      = number_format((float) $plan->annual_fee, 0, '.', '');
                }
            }

            // A negotiated quote overrides the catalogue price for that school.
            $override = $this->setting('ratebook.' . (int) $school->id, null);

            if ($override !== null && $override !== '') {
                $fee = number_format((float) $override, 0, '.', '');
            }

            $out[] = [
                (string) ($school->name ?? 'Unnamed school'),
                $planName,
                $fee,
                (int) ($school->id ?? 0),
            ];
        }

        return $out;
    }

    /**
     * Save the negotiated annual fee for one school.
     */
    public function saveRate(int $schoolId, float $fee): bool
    {
        if ($schoolId <= 0) {
            return false;
        }

        if ($fee < 0) {
            return false;
        }

        return $this->setSetting('ratebook.' . $schoolId, number_format($fee, 0, '.', ''));
    }

    /**
     * Record that a renewal reminder was prepared for a school.
     *
     * The reminder is written to the platform log; delivering it by email is
     * an infrastructure concern and the log is the honest record of what was
     * actually done.
     *
     * @return array{ok:bool,message:string}
     */
    public function recordReminder(string $schoolName, string $note): array
    {
        $schoolName = trim($schoolName);

        if ($schoolName === '') {
            return ['ok' => false, 'message' => 'Choose a school first'];
        }

        $db = \Config\Database::connect();

        $school = $db->table('schools')->where('name', $schoolName)->get()->getRow();

        if ($school === null) {
            return ['ok' => false, 'message' => 'No school installation matches that name'];
        }

        $log = $this->setting('reminder_log', '[]');
        $entries = json_decode((string) $log, true);
        $entries = is_array($entries) ? $entries : [];

        $entries[] = [
            'school_id' => (int) $school->id,
            'school'    => $schoolName,
            'note'      => $note !== '' ? $note : 'Renewal reminder prepared',
            'at'        => date('c'),
            'by'        => auth()->loggedIn() ? (int) auth()->id() : null,
        ];

        // Keep the log bounded.
        $entries = array_slice($entries, -50);

        $this->setSetting('reminder_log', (string) json_encode($entries));

        return [
            'ok'      => true,
            'message' => 'Renewal reminder recorded for ' . $schoolName,
        ];
    }

    /**
     * The renewal reminder log, newest last.
     *
     * @return list<array<string, mixed>>
     */
    public function reminderLog(): array
    {
        $entries = json_decode((string) $this->setting('reminder_log', '[]'), true);

        return is_array($entries) ? $entries : [];
    }

    /* ----------------------------------------------------------- QUOTES */

    /**
     * The negotiated quote of every school installation.
     *
     * A quote holds the annual fee that was agreed with the school plus the
     * add-ons that were priced separately. It is a commercial record on the
     * control plane; it never contains learner data.
     *
     * @return list<array<string, mixed>>
     */
    public function quotes(): array
    {
        $schools = (new SchoolsModel())->findAll();
        $out     = [];

        foreach ($schools as $school) {
            $schoolId = (int) ($school->id ?? 0);
            $quote    = $this->quoteFor($schoolId);

            $out[] = [
                'school_id'   => $schoolId,
                'school'      => (string) ($school->name ?? 'Unnamed school'),
                'annual_fee'  => (string) ($quote['annual_fee'] ?? ''),
                'addons'      => array_values((array) ($quote['addons'] ?? [])),
                'updated_at'  => (string) ($quote['updated_at'] ?? ''),
            ];
        }

        return $out;
    }

    /**
     * The stored quote of one school.
     *
     * @return array<string, mixed>
     */
    public function quoteFor(int $schoolId): array
    {
        if ($schoolId <= 0) {
            return [];
        }

        $quote = json_decode((string) $this->setting('quote.' . $schoolId, '{}'), true);

        return is_array($quote) ? $quote : [];
    }

    /**
     * Save a negotiated quote: the annual fee and/or an add-on.
     *
     * @param array<string, mixed> $in
     *
     * @return array{ok:bool,message:string,quote?:array<string,mixed>}
     */
    public function saveQuote(array $in): array
    {
        $schoolId = (int) ($in['school_id'] ?? 0);

        if ($schoolId <= 0) {
            return ['ok' => false, 'message' => 'Choose a school installation first'];
        }

        $school = \Config\Database::connect()->table('schools')->where('id', $schoolId)->get()->getRow();

        if ($school === null) {
            return ['ok' => false, 'message' => 'No school installation matches that id'];
        }

        $quote = $this->quoteFor($schoolId);

        $fee = $in['annual_fee'] ?? null;

        if ($fee !== null && $fee !== '') {
            $fee = (float) $fee;

            if ($fee < 0) {
                return ['ok' => false, 'message' => 'The annual fee cannot be negative'];
            }

            $quote['annual_fee'] = number_format($fee, 0, '.', '');

            $this->saveRate($schoolId, $fee);
        }

        $addOn = trim((string) ($in['add_on'] ?? ''));

        if ($addOn !== '') {
            $addons = array_values((array) ($quote['addons'] ?? []));

            if (! in_array($addOn, $addons, true)) {
                $addons[] = $addOn;
            }

            $quote['addons'] = $addons;
        }

        if (! array_key_exists('annual_fee', $quote) && ! array_key_exists('addons', $quote)) {
            return ['ok' => false, 'message' => 'Nothing to save on this quote'];
        }

        $quote['updated_at'] = date('c');
        $quote['updated_by'] = auth()->loggedIn() ? (int) auth()->id() : null;

        $saved = $this->setSetting('quote.' . $schoolId, (string) json_encode($quote));

        if ($saved === false) {
            return ['ok' => false, 'message' => 'The quote could not be saved'];
        }

        return [
            'ok'      => true,
            'message' => 'Quote saved for ' . (string) ($school->name ?? 'the school'),
            'quote'   => $quote,
        ];
    }

    /* ------------------------------------------------- INSTALLATION HEALTH */

    /**
     * The installation health of every school installation.
     *
     * @return list<array<string, mixed>>
     */
    public function installationHealth(): array
    {
        $db = \Config\Database::connect();

        try {
            $rows = $db->table('schools')
                ->select('id, name, school_code, installation_state, installation_status, provisioned_at, updated_at')
                ->orderBy('id', 'DESC')
                ->get()
                ->getResultArray();
        } catch (\Throwable $e) {
            log_message('error', 'PlatformService::installationHealth: ' . $e->getMessage());

            return [];
        }

        $out = [];

        foreach ($rows as $row) {
            $out[] = [
                'school'  => (string) ($row['name'] ?? 'Unnamed school'),
                'code'    => (string) ($row['school_code'] ?? ''),
                'state'   => (string) ($row['installation_state'] ?? 'requested'),
                'status'  => (string) ($row['installation_status'] ?? ''),
                'at'      => $this->since((string) ($row['provisioned_at'] ?? $row['updated_at'] ?? '')),
            ];
        }

        return $out;
    }

    /* ------------------------------------------------- TEMPLATE REQUESTS */

    /**
     * A short "3 minutes ago" style label for a platform timestamp.
     */
    private function since(string $timestamp): string
    {
        $timestamp = trim($timestamp);

        if ($timestamp === '' || $timestamp === '0000-00-00 00:00:00') {
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

    /**
     * The custom print-design requests, stored as support tickets.
     *
     * @return list<array<string, mixed>>
     */
    public function templateRequests(): array
    {
        $out = [];

        foreach ($this->tickets(200) as $ticket) {
            $subject = (string) ($ticket['subject'] ?? '');

            if (! str_starts_with($subject, self::TEMPLATE_REQUEST_PREFIX)) {
                continue;
            }

            $out[] = [
                'ticket_no' => (string) ($ticket['ticket_no'] ?? ''),
                'school'    => (string) ($ticket['school_name'] ?? 'Platform level'),
                'subject'   => $subject,
                'priority'  => (string) ($ticket['priority'] ?? 'Normal'),
                'status'    => (string) ($ticket['status'] ?? 'new'),
                'at'        => $this->since((string) ($ticket['created_at'] ?? '')),
            ];
        }

        return $out;
    }
}
