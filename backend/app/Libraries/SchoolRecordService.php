<?php

namespace App\Libraries;

/**
 * Write operations against a school's OWN dedicated database.
 *
 * TENANT SAFETY (ADR-001 / ADR-003):
 *  - Every method requires a resolved school connection. There is no way to
 *    pass a database name from a browser.
 *  - Nothing here ever touches the control-plane tables.
 *  - Values are validated and bound as query parameters; no SQL string is
 *    built from request data.
 */
class SchoolRecordService
{
    private $conn;
    private ?int $schoolId;

    public function __construct($conn = null, ?int $schoolId = null)
    {
        $this->conn     = $conn;
        $this->schoolId = $schoolId;
    }

    private function db()
    {
        if ($this->conn === null) {
            throw new \RuntimeException('No school database connection');
        }

        return $this->conn;
    }

    private function now(): string
    {
        return date('Y-m-d H:i:s');
    }

    private function clean(?string $v, int $max = 191): string
    {
        return trim(substr((string) $v, 0, $max));
    }

    /* ------------------------------------------------------------ STUDENTS */

    /**
     * @return array{ok:bool,message:string,id?:int}
     */
    public function createStudent(array $in): array
    {
        $first = $this->clean($in['first_name'] ?? '');
        $last  = $this->clean($in['last_name'] ?? '');
        $adm   = $this->clean($in['admission_number'] ?? '');

        if ($first === '') {
            return ['ok' => false, 'message' => 'First name is required'];
        }

        if ($adm === '') {
            return ['ok' => false, 'message' => 'Admission number is required'];
        }

        $db = $this->db();

        $exists = $db->table('students')
            ->where('admission_number', $adm)
            ->countAllResults();

        if ($exists > 0) {
            return ['ok' => false, 'message' => 'That admission number already exists'];
        }

        $gender = in_array($in['gender'] ?? '', ['male', 'female', 'other'], true)
            ? $in['gender']
            : null;

        $status = $in['status'] ?? 'active';
        $status = in_array($status, ['active', 'inactive', 'transferred', 'withdrawn', 'archived'], true)
            ? $status
            : 'active';

        $db->table('students')->insert([
            'first_name'       => $first,
            'last_name'        => $last,
            'admission_number' => $adm,
            'date_of_birth'    => $this->clean($in['date_of_birth'] ?? '', 10) ?: null,
            'gender'           => $gender,
            'status'           => $status,
            'created_at'       => $this->now(),
            'updated_at'       => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Student added', 'id' => (int) $db->insertID()];
    }

    /* ------------------------------------------------------------- STAFF */

    /**
     * @return array{ok:bool,message:string,id?:int}
     */
    public function createStaff(array $in): array
    {
        $first = $this->clean($in['first_name'] ?? '');
        $emp   = $this->clean($in['employee_id'] ?? '');
        $role  = $this->clean($in['role_type'] ?? '');

        if ($first === '') {
            return ['ok' => false, 'message' => 'First name is required'];
        }

        if ($emp === '') {
            return ['ok' => false, 'message' => 'Employee ID is required'];
        }

        if ($role === '') {
            return ['ok' => false, 'message' => 'Role type is required'];
        }

        $db = $this->db();

        if ($db->table('staff')->where('employee_id', $emp)->countAllResults() > 0) {
            return ['ok' => false, 'message' => 'That employee ID already exists'];
        }

        $db->table('staff')->insert([
            'first_name'  => $first,
            'last_name'   => $this->clean($in['last_name'] ?? ''),
            'employee_id' => $emp,
            'role_type'   => $role,
            'status'      => 'active',
            'created_at'  => $this->now(),
            'updated_at'  => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Staff member added', 'id' => (int) $db->insertID()];
    }

    /* --------------------------------------------------------- ATTENDANCE */

    /**
     * Mark attendance for one student on one date.
     *
     * @return array{ok:bool,message:string}
     */
    public function markAttendance(array $in): array
    {
        $studentId = (int) ($in['student_id'] ?? 0);
        $status    = $this->clean($in['status'] ?? '', 20);
        $date      = $this->clean($in['attendance_date'] ?? '', 10);

        if ($studentId <= 0) {
            return ['ok' => false, 'message' => 'A student is required'];
        }

        if (! in_array($status, ['present', 'absent', 'leave'], true)) {
            return ['ok' => false, 'message' => 'Status must be present, absent or leave'];
        }

        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $date = date('Y-m-d');
        }

        $db = $this->db();

        if ($db->table('students')->where('id', $studentId)->get()->getRow() === null) {
            return ['ok' => false, 'message' => 'Student not found'];
        }

        $existing = $db->table('attendance')
            ->where('student_id', $studentId)
            ->where('attendance_date', $date)
            ->get()
            ->getRow();

        if ($existing !== null) {
            $db->table('attendance')->where('id', $existing->id)->update([
                'status'     => $status,
                'updated_at' => $this->now(),
            ]);

            return ['ok' => true, 'message' => 'Attendance updated'];
        }

        $db->table('attendance')->insert([
            'student_id'      => $studentId,
            'attendance_date' => $date,
            'status'          => $status,
            'created_at'      => $this->now(),
            'updated_at'      => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Attendance recorded'];
    }

    /* ---------------------------------------------------------------- FEES */

    /**
     * @return array{ok:bool,message:string,id?:int}
     */
    public function createFeeInvoice(array $in): array
    {
        $studentId = (int) ($in['student_id'] ?? 0);
        $head      = $this->clean($in['fee_head'] ?? '');
        $amount    = (int) ($in['amount'] ?? 0);

        if ($studentId <= 0) {
            return ['ok' => false, 'message' => 'A student is required'];
        }

        if ($head === '') {
            return ['ok' => false, 'message' => 'Fee head is required'];
        }

        if ($amount <= 0) {
            return ['ok' => false, 'message' => 'Amount must be greater than zero'];
        }

        $db = $this->db();

        if ($db->table('students')->where('id', $studentId)->get()->getRow() === null) {
            return ['ok' => false, 'message' => 'Student not found'];
        }

        $db->table('fee_invoices')->insert([
            'academic_session_id' => (int) ($in['academic_session_id'] ?? 0) ?: null,
            'student_id'          => $studentId,
            'fee_head'            => $head,
            'amount'              => $amount,
            'due_date'            => $this->clean($in['due_date'] ?? '', 10) ?: null,
            'status'              => 'unpaid',
            'created_at'          => $this->now(),
            'updated_at'          => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Invoice created', 'id' => (int) $db->insertID()];
    }

    /**
     * Record a manual receipt against an invoice. No online gateway.
     *
     * @return array{ok:bool,message:string,id?:int}
     */
    public function recordReceipt(array $in): array
    {
        $invoiceId = (int) ($in['invoice_id'] ?? 0);
        $amount    = (int) ($in['amount_paid'] ?? 0);
        $mode      = $this->clean($in['payment_mode'] ?? '');
        $ref       = $this->clean($in['reference'] ?? '');

        if ($invoiceId <= 0) {
            return ['ok' => false, 'message' => 'An invoice is required'];
        }

        if ($amount <= 0) {
            return ['ok' => false, 'message' => 'Amount must be greater than zero'];
        }

        if (! in_array($mode, ['cash', 'bank', 'cheque', 'wallet'], true)) {
            return ['ok' => false, 'message' => 'Payment mode must be cash, bank, cheque or wallet'];
        }

        $db = $this->db();

        $invoice = $db->table('fee_invoices')->where('id', $invoiceId)->get()->getRow();

        if ($invoice === null) {
            return ['ok' => false, 'message' => 'Invoice not found'];
        }

        if ($amount > (int) $invoice->amount) {
            return ['ok' => false, 'message' => 'Amount is larger than the invoice'];
        }

        $db->table('fee_receipts')->insert([
            'invoice_id'    => $invoiceId,
            'receipt_number' => 'RC-' . str_pad((string) ($db->table('fee_receipts')->countAllResults() + 1), 6, '0', STR_PAD_LEFT),
            'amount_paid'   => $amount,
            'payment_mode'  => $mode,
            'reference'     => $ref,
            'collector_id'  => $this->schoolId,
            'paid_at'       => $this->now(),
            'created_at'    => $this->now(),
        ]);

        $db->table('fee_invoices')->where('id', $invoiceId)->update([
            'status'     => 'paid',
            'updated_at' => $this->now(),
        ]);

        return ['ok' => true, 'message' => 'Receipt recorded'];
    }

    /* --------------------------------------------------------------- READ */

    /**
     * @return list<array<string, mixed>>
     */
    public function listStudents(int $limit = 200): array
    {
        return $this->db()->table('students')->orderBy('id', 'DESC')->get($limit)->getResultArray();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listInvoices(int $limit = 200): array
    {
        return $this->db()->table('fee_invoices')->orderBy('id', 'DESC')->get($limit)->getResultArray();
    }
}