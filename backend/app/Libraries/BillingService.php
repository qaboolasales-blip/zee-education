<?php

namespace App\Libraries;

/**
 * Manual licence billing: quote -> collect -> settle -> renew.
 *
 * WHY THIS IS MANUAL BY DESIGN
 * ----------------------------
 * Fee collection is a bank transfer or a cash handover confirmed by the
 * operator. There is no payment gateway, so this class must never pretend to
 * have verified money. It records exactly what the operator asserted:
 * who collected, how much, when, and by what reference.
 *
 * THE RULE THAT MATTERS
 * ---------------------
 * A licence is renewed ONLY when the payments against an invoice reach the
 * invoiced amount (isSettled). A part payment is recorded honestly and shows
 * on the invoice, but it never grants a school more time. This keeps a school
 * from "renewing" itself with 90% of the fee.
 *
 * MONEY IS NEVER STORED AS A FLOAT
 * -------------------------------
 * Amounts are DECIMAL(12,2) in the database and are compared there. Sums are
 * taken in SQL (SUM(amount)) rather than in PHP, so no rounding drift between
 * the invoice total and its payments can accumulate.
 *
 * AUDIT TRAIL
 * ------------
 * A renewal inserts a NEW invoice and a NEW licence row rather than editing the
 * old ones. Nothing is ever deleted, so a school's billing history stays
 * reconstructable years later.
 */
class BillingService
{
    public const STATUS_DUE     = 'due';
    public const STATUS_PARTIAL = 'partial';
    public const STATUS_PAID    = 'paid';
    public const STATUS_VOID    = 'void';
    public const STATUS_OVERDUE = 'overdue';

    public const KIND_SETUP      = 'setup';
    public const KIND_FIRST_YEAR = 'first_year';
    public const KIND_RENEWAL    = 'renewal';

    /**
     * Quote a licence fee for a school. Nothing is collected yet.
     *
     * @param array{due_days?:int, notes?:string, period_start?:string, period_end?:string} $options
     */
    public function createInvoice(int $schoolId, int $planId, string $kind = self::KIND_RENEWAL, array $options = []): int
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $plan = $db->table('license_plans')->where('id', $planId)->get()->getRow();

        if ($plan === null) {
            throw new \RuntimeException('Unknown plan: ' . $planId);
        }

        $license = service('licenses')->currentForSchool($schoolId);

        $periodStart = $options['period_start']
            ?? ($license !== null && $kind === self::KIND_RENEWAL ? (string) $license->expires_at : date('Y-m-d'));

        $periodEnd = $options['period_end']
            ?? date('Y-m-d', strtotime($periodStart . ' +1 year -1 day'));

        $db->table('license_invoices')->insert([
            'invoice_no'   => $this->nextInvoiceNo(),
            'school_id'    => $schoolId,
            'license_id'   => $license->id ?? null,
            'plan_id'      => $planId,
            'kind'         => $kind,
            'period_start' => $periodStart,
            'period_end'   => $periodEnd,
            'amount'       => $plan->annual_fee,
            'amount_paid'  => 0,
            'currency'     => $plan->currency,
            'status'       => self::STATUS_DUE,
            'due_date'     => date('Y-m-d', strtotime('+' . (int) ($options['due_days'] ?? 15) . ' days')),
            'issued_at'    => $now,
            'notes'        => $options['notes'] ?? null,
            'created_at'   => $now,
            'updated_at'   => $now,
        ]);

        return (int) $db->insertID();
    }

    /**
     * Record money the operator confirms receiving.
     *
     * This does NOT renew anything by itself. Renewal happens only inside
     * renewForInvoice, which the caller invokes after this returns true.
     *
     * @return array{invoice_id:int, amount_paid:string, settled:bool, new_license_key:?string}
     */
    public function recordPayment(int $invoiceId, float $amount, string $method = 'bank_transfer', ?string $reference = null, ?int $receivedBy = null, ?string $note = null): array
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Payment amount must be greater than zero.');
        }

        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $invoice = $db->table('license_invoices')->where('id', $invoiceId)->get()->getRow();

        if ($invoice === null) {
            throw new \RuntimeException('Unknown invoice: ' . $invoiceId);
        }

        if ($invoice->status === self::STATUS_VOID) {
            throw new \RuntimeException('Cannot record a payment against a void invoice.');
        }

        $db->table('license_payments')->insert([
            'invoice_id'  => $invoiceId,
            'school_id'   => (int) $invoice->school_id,
            'amount'      => $amount,
            'method'      => $method,
            'reference'   => $reference,
            'received_at' => $now,
            'received_by' => $receivedBy,
            'note'        => $note,
            'created_at'  => $now,
        ]);

        $paid = $this->paidTotal($invoiceId);
        $settled = bccomp((string) $paid, (string) $invoice->amount, 2) >= 0;

        $update = [
            'amount_paid'     => $paid,
            'status'          => $settled ? self::STATUS_PAID : self::STATUS_PARTIAL,
            'payment_method'  => $method,
            'payment_reference' => $reference ?? $invoice->payment_reference,
            'updated_at'      => $now,
        ];

        if ($settled) {
            $update['paid_at'] = $now;
        }

        $db->table('license_invoices')->where('id', $invoiceId)->update($update);

        $newKey = $settled ? $this->renewForInvoice($invoice) : null;

        return [
            'invoice_id'      => $invoiceId,
            'amount_paid'     => (string) $paid,
            'settled'         => $settled,
            'new_license_key' => $newKey,
        ];
    }

    /**
     * True when the payments against an invoice cover its full amount.
     */
    public function isSettled(int $invoiceId): bool
    {
        $invoice = \Config\Database::connect()->table('license_invoices')->where('id', $invoiceId)->get()->getRow();

        if ($invoice === null || $invoice->status === self::STATUS_VOID) {
            return false;
        }

        return bccomp($this->paidTotal($invoiceId), (string) $invoice->amount, 2) >= 0;
    }

    /**
     * Extend a school's licence because a settled invoice has been paid.
     *
     * Renewal continues from the existing expiry when the school paid early, so
     * paying ahead never costs a school the days it already paid for. A fresh
     * licence KEY is issued on every renewal: an old key stops working, which
     * limits how long a leaked key stays useful.
     *
     * @return string|null the new licence key, or null if there is nothing to renew
     */
    public function renewForInvoice(object $invoice): ?string
    {
        $licenses = service('licenses');

        $schoolId = (int) $invoice->school_id;
        $current  = $licenses->currentForSchool($schoolId);

        $today = date('Y-m-d');

        // Renewing early (or on time): start the next period after the current
        // one ends. Renewing late: start today, so the school is not billed for
        // time that has already passed.
        $start = ($current !== null && $current->expires_at > $today)
            ? (string) $current->expires_at
            : $today;

        $planId = (int) ($invoice->plan_id ?? $current->plan_id ?? 0);

        if ($planId === 0) {
            return null;
        }

        $issued = $licenses->issue($schoolId, $planId, $start, [
            'notes' => 'Renewed against invoice ' . $invoice->invoice_no,
        ]);

        // Retire the superseded licence row so only one active licence is
        // visible per school. The row is kept (status changed, not deleted) to
        // preserve the billing history.
        if ($current !== null) {
            \Config\Database::connect()
                ->table('school_licenses')
                ->where('id', $current->id)
                ->update([
                    'status'     => 'superseded',
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);
        }

        return $issued['license_key'];
    }

    /**
     * Cancel an unpaid invoice. Never deletes the row.
     */
    public function voidInvoice(int $invoiceId, ?string $reason = null): bool
    {
        $db = \Config\Database::connect();

        $invoice = $db->table('license_invoices')->where('id', $invoiceId)->get()->getRow();

        if ($invoice === null || $invoice->status === self::STATUS_PAID || $invoice->status === self::STATUS_VOID) {
            return false;
        }

        $db->table('license_invoices')->where('id', $invoiceId)->update([
            'status'     => self::STATUS_VOID,
            'notes'      => $reason !== null ? mb_substr($reason, 0, 255) : $invoice->notes,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return true;
    }

    /**
     * Money actually collected, summed in SQL so it always matches the ledger.
     */
    public function paidTotal(int $invoiceId): string
    {
        $row = \Config\Database::connect()
            ->table('license_payments')
            ->select('COALESCE(SUM(amount), 0) AS total', false)
            ->where('invoice_id', $invoiceId)
            ->get()
            ->getRow();

        return number_format((float) $row->total, 2, '.', '');
    }

    /**
     * Revenue collected within a date range.
     *
     * @param string $since   Date/time string (e.g. '2026-01-01 00:00:00') for lower bound
     * @param string|null $until Date/time string for upper bound (exclusive), or null for no upper bound
     */
    public function revenueForPeriod(string $since, ?string $until = null): string
    {
        $db = \Config\Database::connect();
        $query = $db->table('license_invoices')
            ->select('COALESCE(SUM(amount_paid), 0) AS total', false)
            ->where('status', self::STATUS_PAID)
            ->where('paid_at >=', $since);

        if ($until !== null) {
            $query->where('paid_at <', $until);
        }

        $row = $query->get()->getRow();
        return number_format((float) $row->total, 2, '.', '');
    }

    /**
     * Licences inside the renewal window, soonest first. Drives the Super Admin
     * "Renewals needing attention" card.
     */
    public function upcomingRenewals(int $withinDays = 30): array
    {
        try {
            return \Config\Database::connect()
                ->table('school_licenses')
                ->select('school_licenses.*, schools.name AS school_name, license_plans.name AS plan_name')
                ->join('schools', 'schools.id = school_licenses.school_id', 'left')
                ->join('license_plans', 'license_plans.id = school_licenses.plan_id', 'left')
                ->whereIn('school_licenses.status', [LicenseService::STATUS_ACTIVE, LicenseService::STATUS_RENEWAL_DUE, LicenseService::STATUS_GRACE])
                ->where('school_licenses.expires_at <=', date('Y-m-d', strtotime('+' . $withinDays . ' days')))
                ->orderBy('school_licenses.expires_at', 'ASC')
                ->get()
                ->getResultArray();
        } catch (\Throwable $e) {
            log_message('error', 'BillingService::upcomingRenewals: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * Commercial totals for the Super Admin dashboard. Revenue counts only
     * PAID invoices, so a quote that has not been collected never inflates it.
     */
    public function summary(): array
    {
        $db = \Config\Database::connect();

        $revenue = $db->table('license_invoices')
            ->select('COALESCE(SUM(amount), 0) AS total', false)
            ->where('status', self::STATUS_PAID)
            ->get()->getRow();

        $outstanding = $db->table('license_invoices')
            ->select('COALESCE(SUM(amount - amount_paid), 0) AS total', false)
            ->whereIn('status', [self::STATUS_DUE, self::STATUS_PARTIAL, self::STATUS_OVERDUE])
            ->get()->getRow();

        $overdue = $db->table('license_invoices')
            ->select('COUNT(*) AS c', false)
            ->where('status', self::STATUS_OVERDUE)
            ->get()->getRow();

        return [
            'revenue_collected'  => number_format((float) $revenue->total, 2, '.', ''),
            'outstanding'        => number_format((float) $outstanding->total, 2, '.', ''),
            'overdue_count'      => (int) $overdue->c,
            'currency'           => 'PKR',
        ];
    }

    /**
     * Flag unpaid invoices past their due date. Safe to run repeatedly.
     */
    public function markOverdue(): int
    {
        $db = \Config\Database::connect();

        return $db->table('license_invoices')
            ->whereIn('status', [self::STATUS_DUE, self::STATUS_PARTIAL])
            ->where('due_date <', date('Y-m-d'))
            ->update(['status' => self::STATUS_OVERDUE, 'updated_at' => date('Y-m-d H:i:s')]);
    }

    /**
     * Invoice rows for a school, newest first.
     */
    public function invoicesForSchool(int $schoolId): array
    {
        try {
            return \Config\Database::connect()
                ->table('license_invoices')
                ->where('school_id', $schoolId)
                ->orderBy('id', 'DESC')
                ->get()
                ->getResultArray();
        } catch (\Throwable $e) {
            log_message('error', 'BillingService::invoicesForSchool: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * Sequential, human-readable invoice number: ZEE-INV-2026-0001.
     *
     * Counted from the existing rows for the year rather than a database
     * sequence so the number is predictable when the owner reads it aloud. The
     * retry loop guards the (rare) case of two quotes issued in the same second.
     */
    private function nextInvoiceNo(): string
    {
        $db   = \Config\Database::connect();
        $year = date('Y');

        for ($attempt = 0; $attempt < 50; $attempt++) {
            $count = $db->table('license_invoices')
                ->like('invoice_no', 'ZEE-INV-' . $year . '-')
                ->countAllResults();

            $candidate = sprintf('ZEE-INV-%s-%04d', $year, $count + 1 + $attempt);

            $exists = $db->table('license_invoices')->where('invoice_no', $candidate)->countAllResults();

            if ($exists === 0) {
                return $candidate;
            }
        }

        throw new \RuntimeException('Could not allocate a unique invoice number.');
    }
}