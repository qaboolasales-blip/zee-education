<?php

namespace App\Controllers;

use App\Libraries\AuditService;
use App\Libraries\BillingService;
use App\Libraries\LicenseService;

/**
 * Super Admin commercial API.
 *
 * The endpoints documented as POST /admin/schools/provision previously existed
 * in documentation but had no implementation; this file fills that gap.
 *
 * THE COMMERCIAL RULE, STATED CLEARLY
 * -----------------------------------
 * Money collection is MANUAL: there is no payment gateway and no automatic
 * charging. Every POST here records EXACTLY what the operator asserted - who,
 * how much, when, by what reference. A quote is never revenue. A partial
 * payment is recorded honestly but never grants access. A licence is renewed
 * ONLY when the payments against an invoice reach the full invoiced amount
 * (BillingService::isSettled). Renewal continues from the existing expiry when
 * the school pays on time, so paying early never costs the school days it has
 * already paid for.
 *
 * LICENCE KEYS ARE NEVER PERSISTED IN PLAIN TEXT
 * -----------------------------------------------
 * A plaintext key is returned ONCE at issue time and is never stored. Later
 * calls return only the row id, hash, prefix and last_verified_at. A new
 * renewal issues a new key, so an old key stops working and a leaked key has a
 * bounded life.
 *
 * WHO MAY CALL THESE ENDPOINTS
 * ----------------------------
 * Super Admin only. The operator collects fees on behalf of schools; a school
 * never calls these, because it does not know what it is paying. Every route in
 * this group sits behind [superadmin], so a signed-in school user is refused
 * before it reaches any code in this file.
 */
class BillingApi extends BaseController
{
    private BillingService $billing;

    private LicenseService $licenses;

    public function __construct()
    {
        $this->billing  = service('billing');
        $this->licenses = service('licenses');
    }

    // -----------------------------------------------------------------
    // reads
    // -----------------------------------------------------------------

    /** GET /api/admin/billing/summary */
    public function summary()
    {
        try {
            return $this->json($this->billing->summary());
        } catch (\Throwable $e) {
            log_message('error', 'BillingApi::summary: ' . $e->getMessage());

            return $this->json(['ok' => false, 'message' => 'Could not read summary'], 500);
        }
    }

    /** GET /api/admin/billing/upcomings */
    public function upcomings()
    {
        try {
            $rows = $this->billing->upcomingRenewals(LicenseService::RENEWAL_WINDOW_DAYS);

            return $this->json([
                'ok'    => true,
                'items' => $rows,
                'count' => count($rows),
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'BillingApi::upcomings: ' . $e->getMessage());

            return $this->json(['ok' => false, 'message' => 'Could not list renewals'], 500);
        }
    }

    /** GET /api/admin/billing/invoices/{schoolId} */
    public function invoices($schoolId = null)
    {
        $schoolId = (int) $schoolId;

        if ($schoolId <= 0) {
            return $this->json(['ok' => false, 'message' => 'A valid school id is required'], 422);
        }

        try {
            return $this->json([
                'ok'       => true,
                'invoices' => $this->billing->invoicesForSchool($schoolId),
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'BillingApi::invoices: ' . $e->getMessage());

            return $this->json(['ok' => false, 'message' => 'Could not read invoices'], 500);
        }
    }

    // -----------------------------------------------------------------
    // writes
    // -----------------------------------------------------------------

    /**
     * POST /api/admin/billing/issue
     *
     * Issue a fresh annual licence to a school. The plaintext key is returned
     * exactly once; only its hash is stored.
     */
    public function issue()
    {
        $body = $this->body();

        $schoolId = (int) ($body['school_id'] ?? 0);
        $planId   = (int) ($body['plan_id'] ?? 0);

        if ($schoolId <= 0) {
            return $this->json(['ok' => false, 'message' => 'school_id is required'], 422);
        }

        if ($planId <= 0) {
            return $this->json(['ok' => false, 'message' => 'plan_id is required'], 422);
        }

        if (! $this->schoolExists($schoolId)) {
            return $this->json(['ok' => false, 'message' => 'Unknown school'], 422);
        }

        $options = [];

        if (! empty($body['start_date'])) {
            $options['start_date'] = (string) $body['start_date'];
        }

        if (! empty($body['expires_at'])) {
            $options['expires_at'] = (string) $body['expires_at'];
        }

        if (isset($body['grace_days'])) {
            $options['grace_days'] = max(0, min(365, (int) $body['grace_days']));
        }

        try {
            $issued = $this->licenses->issue($schoolId, $planId, $options['start_date'] ?? null, $options);

            $this->audit('licence.issue', 'school', $schoolId);

            return $this->json([
                'ok'          => true,
                'license_id'  => $issued['id'],
                'license_key' => $issued['license_key'],
                'issued_at'   => date('c'),
            ], 201);
        } catch (\Throwable $e) {
            log_message('error', 'BillingApi::issue: ' . $e->getMessage());

            return $this->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /api/admin/billing/invoice
     *
     * Quote a licence fee for a school. Nothing is collected yet: the result
     * is a quote, and a quote is not revenue.
     */
    public function invoice()
    {
        $body = $this->body();

        $schoolId = (int) ($body['school_id'] ?? 0);
        $planId   = (int) ($body['plan_id'] ?? 0);

        if ($schoolId <= 0) {
            return $this->json(['ok' => false, 'message' => 'school_id is required'], 422);
        }

        if ($planId <= 0) {
            return $this->json(['ok' => false, 'message' => 'plan_id is required'], 422);
        }

        if (! $this->schoolExists($schoolId)) {
            return $this->json(['ok' => false, 'message' => 'Unknown school'], 422);
        }

        $kind = (string) ($body['kind'] ?? BillingService::KIND_RENEWAL);

        if (! in_array($kind, [BillingService::KIND_SETUP, BillingService::KIND_FIRST_YEAR, BillingService::KIND_RENEWAL], true)) {
            return $this->json(['ok' => false, 'message' => 'Unknown invoice kind'], 422);
        }

        $options = [];

        if (! empty($body['period_start'])) {
            $options['period_start'] = (string) $body['period_start'];
        }

        if (! empty($body['period_end'])) {
            $options['period_end'] = (string) $body['period_end'];
        }

        if (isset($body['due_days'])) {
            $options['due_days'] = max(1, (int) $body['due_days']);
        }

        if (! empty($body['notes'])) {
            $options['notes'] = (string) $body['notes'];
        }

        try {
            $id = $this->billing->createInvoice($schoolId, $planId, $kind, $options);

            $invoice = \Config\Database::connect()
                ->table('license_invoices')
                ->where('id', $id)
                ->get()
                ->getRow();

            $this->audit('invoice.create', 'invoice', (int) $id);

            return $this->json([
                'ok'         => true,
                'invoice_id' => (int) $id,
                'invoice_no' => $invoice->invoice_no ?? null,
                'amount'     => $invoice->amount ?? null,
                'currency'   => $invoice->currency ?? null,
                'due_date'   => $invoice->due_date ?? null,
                'status'     => $invoice->status ?? BillingService::STATUS_DUE,
            ], 201);
        } catch (\Throwable $e) {
            log_message('error', 'BillingApi::invoice: ' . $e->getMessage());

            return $this->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /api/admin/billing/pay
     *
     * Record money the operator confirms receiving. The renewal happens INSIDE
     * this call, and only when the payments cover the full invoiced amount.
     */
    public function pay()
    {
        $body = $this->body();

        $invoiceId = (int) ($body['invoice_id'] ?? 0);
        $amount    = (float) ($body['amount'] ?? 0);

        if ($invoiceId <= 0) {
            return $this->json(['ok' => false, 'message' => 'invoice_id is required'], 422);
        }

        if ($amount <= 0) {
            return $this->json(['ok' => false, 'message' => 'amount must be greater than zero'], 422);
        }

        $method   = trim((string) ($body['method'] ?? 'bank_transfer'));
        $reference = $body['reference'] ?? null;
        $note      = $body['note'] ?? null;

        try {
            $result = $this->billing->recordPayment(
                $invoiceId,
                $amount,
                $method,
                $reference === null ? null : (string) $reference,
                $this->actorId(),
                $note === null ? null : (string) $note
            );

            $this->audit('payment.record', 'invoice', $invoiceId);

            return $this->json([
                'ok'              => true,
                'invoice_id'      => $result['invoice_id'],
                'amount_paid'     => $result['amount_paid'],
                'settled'         => $result['settled'],
                'renewed'         => $result['settled'],
                'new_license_key' => $result['new_license_key'],
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'BillingApi::pay: ' . $e->getMessage());

            return $this->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /api/admin/billing/void
     *
     * Cancel an unpaid invoice. The row is never deleted.
     */
    public function voidInvoice()
    {
        $body = $this->body();

        $invoiceId = (int) ($body['invoice_id'] ?? 0);
        $reason    = $body['reason'] ?? null;

        if ($invoiceId <= 0) {
            return $this->json(['ok' => false, 'message' => 'invoice_id is required'], 422);
        }

        try {
            $voided = $this->billing->voidInvoice($invoiceId, $reason === null ? null : (string) $reason);

            $this->audit('invoice.void', 'invoice', $invoiceId);

            return $this->json([
                'ok'         => $voided,
                'invoice_id' => $invoiceId,
                'status'     => $voided ? BillingService::STATUS_VOID : null,
            ], $voided ? 200 : 409);
        } catch (\Throwable $e) {
            log_message('error', 'BillingApi::voidInvoice: ' . $e->getMessage());

            return $this->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /api/admin/billing/revoke
     *
     * Withdraw a school's licence. The school becomes read-only immediately;
     * nothing is deleted and its data stays readable.
     */
    public function revoke()
    {
        $body = $this->body();

        $schoolId = (int) ($body['school_id'] ?? 0);
        $reason   = trim((string) ($body['reason'] ?? ''));

        if ($schoolId <= 0) {
            return $this->json(['ok' => false, 'message' => 'school_id is required'], 422);
        }

        if ($reason === '') {
            return $this->json(['ok' => false, 'message' => 'reason is required'], 422);
        }

        try {
            $revoked = $this->licenses->revoke($schoolId, $reason);

            $this->audit('licence.revoke', 'school', $schoolId);

            return $this->json([
                'ok'        => $revoked,
                'school_id' => $schoolId,
                'state'     => $revoked ? LicenseService::STATUS_REVOKED : null,
            ], $revoked ? 200 : 409);
        } catch (\Throwable $e) {
            log_message('error', 'BillingApi::revoke: ' . $e->getMessage());

            return $this->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /api/admin/billing/renew
     *
     * Re-issue a licence from a SETTLED invoice. Only an invoice whose payments
     * cover the full amount can trigger renewal. The old licence row is marked
     * superseded (kept, not deleted) and a NEW row with a NEW key is inserted.
     */
    public function renew()
    {
        $body = $this->body();

        $invoiceId = (int) ($body['invoice_id'] ?? 0);

        if ($invoiceId <= 0) {
            return $this->json(['ok' => false, 'message' => 'invoice_id is required'], 422);
        }

        try {
            $invoice = \Config\Database::connect()
                ->table('license_invoices')
                ->where('id', $invoiceId)
                ->get()
                ->getRow();

            if ($invoice === null) {
                return $this->json(['ok' => false, 'message' => 'Unknown invoice'], 422);
            }

            if (! $this->billing->isSettled($invoiceId)) {
                return $this->json([
                    'ok'      => false,
                    'message' => 'Only a fully settled invoice can trigger a renewal',
                ], 422);
            }

            $key = $this->billing->renewForInvoice($invoice);

            if ($key === null) {
                return $this->json(['ok' => false, 'message' => 'Nothing to renew'], 422);
            }

            $schoolId = (int) $invoice->school_id;

            $this->audit('invoice.renew', 'invoice', $invoiceId);

            return $this->json([
                'ok'          => true,
                'school_id'   => $schoolId,
                'license_key' => $key,
                'renewed_at'  => date('c'),
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'BillingApi::renew: ' . $e->getMessage());

            return $this->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // -----------------------------------------------------------------
    // internals
    // -----------------------------------------------------------------

    /**
     * Record a control-plane action against the audit log.
     */
    private function audit(string $action, string $targetType, int $targetId): void
    {
        try {
            (new AuditService())->log($action, 'super_admin', $this->actorId(), $targetType, $targetId);
        } catch (\Throwable $e) {
            // An audit write must never break the business operation, but it
            // must never disappear silently either.
            log_message('error', 'BillingApi::audit could not record ' . $action . ': ' . $e->getMessage());
        }
    }

    private function actorId(): ?int
    {
        $user = auth()->user();

        return $user === null ? null : (int) $user->id;
    }

    /**
     * @return array<array-key, mixed>
     */
    private function body(): array
    {
        $raw = $this->request->getBody();

        if ($raw !== '' && $raw !== null) {
            $data = json_decode((string) $raw, true);

            if (is_array($data)) {
                return $data;
            }
        }

        // Form-encoded callers are accepted too: the operator's own tooling may
        // post a form rather than a JSON document.
        $post = $this->request->getPost();

        return is_array($post) ? $post : [];
    }

    /**
     * A commercial action must always name a school that really exists, so a
     * typo in an id can never create a licence for a school that is not there.
     */
    private function schoolExists(int $schoolId): bool
    {
        return \Config\Database::connect()
            ->table('schools')
            ->where('id', $schoolId)
            ->countAllResults() > 0;
    }

    /**
     * @param array<array-key, mixed> $payload
     */
    private function json(array $payload, int $status = 200)
    {
        return $this->response
            ->setStatusCode($status)
            ->setJSON($payload);
    }
}
