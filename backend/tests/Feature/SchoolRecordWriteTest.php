<?php

namespace Tests\Feature;

use App\Libraries\SchoolRecordService;
use CodeIgniter\Database\MigrationRunner;
use CodeIgniter\Test\CIUnitTestCase;
use Config\Migrations;

/**
 * Behavioural coverage for the school-record write service.
 *
 * WHY THESE TESTS EXIST
 * ---------------------
 * Open defects LB-2 and LB-4: `POST /api/school/attendance` and
 * `POST /api/school/fees/invoices` answered 500 on a real school because the
 * service omitted columns the schema declares NOT NULL, and the invoice path
 * additionally wrote a value outside the column's ENUM. AttendanceTest only
 * asserted that the migration and contract FILES exist, which is exactly why
 * the suite never caught it - so the assertions below drive the real service
 * against the real shipped schema.
 *
 * THE SCHEMA UNDER TEST IS THE SHIPPED ONE
 * ----------------------------------------
 * A scratch MySQL database is created from the `schooldb.*` environment keys
 * (the same keys the app itself uses) and the AppSchool migrations are run
 * into it, so a service/schema mismatch fails here the same way it failed on
 * the live server. The scratch database is dropped again in tearDown, so the
 * shared harness databases are never touched.
 *
 * If the environment defines no school database - or the account may not
 * create one - every test here skips rather than failing, because the absence
 * of a local school database says nothing about the code under test.
 *
 * @internal
 */
final class SchoolRecordWriteTest extends CIUnitTestCase
{
    private const SCRATCH_DB = 'zee_school_write_test';

    private SchoolRecordService $service;

    /** The scratch connection, kept so tearDown can be certain it is closed. */
    private $school;

    protected function setUp(): void
    {
        parent::setUp();

        $host = (string) env('schooldb.default.hostname', '127.0.0.1');
        $user = (string) env('schooldb.default.username', '');
        $pass = (string) env('schooldb.default.password', '');
        $port = (int) (env('schooldb.default.port') ?: 3306);

        if ($user === '') {
            $this->markTestSkipped('No school database is configured for this environment.');
        }

        // Needs a server-level account: root locally and on CI. Any account
        // without CREATE DATABASE simply skips, which is the honest outcome.
        $admin = @new \mysqli($host, $user, $pass, '', $port);

        if ($admin->connect_errno !== 0) {
            $this->markTestSkipped('No reachable MySQL server for the school schema: ' . $admin->connect_error);
        }

        if (! $admin->query('DROP DATABASE IF EXISTS `' . self::SCRATCH_DB . '`')
            || ! $admin->query('CREATE DATABASE `' . self::SCRATCH_DB . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')) {
            $error = $admin->error;
            $admin->close();

            $this->markTestSkipped('The test account cannot create a scratch school database: ' . $error);
        }

        $admin->close();

        $this->school = \CodeIgniter\Database\Config::connect([
            'hostname' => $host,
            'username' => $user,
            'password' => $pass,
            'database' => self::SCRATCH_DB,
            'DBDriver' => 'MySQLi',
            'DBPrefix' => '',
            'charset'  => 'utf8mb4',
            'DBCollat' => 'utf8mb4_unicode_ci',
            'port'     => $port,
            'DBDebug'  => true,
        ], false);

        $runner = new MigrationRunner(new Migrations(), $this->school);
        $runner->setNamespace('AppSchool');
        $runner->latest();
        $runner->setNamespace(null);

        // school_id 7 and actor 42 are arbitrary but stable: the service only
        // needs a non-null actor for attendance.recorded_by.
        $this->service = new SchoolRecordService($this->school, 7, 42);
    }

    protected function tearDown(): void
    {
        if ($this->school !== null) {
            $this->school->close();
            $this->school = null;
        }

        $host = (string) env('schooldb.default.hostname', '127.0.0.1');
        $user = (string) env('schooldb.default.username', '');
        $pass = (string) env('schooldb.default.password', '');
        $port = (int) (env('schooldb.default.port') ?: 3306);

        if ($user !== '') {
            $admin = @new \mysqli($host, $user, $pass, '', $port);

            if ($admin->connect_errno === 0) {
                $admin->query('DROP DATABASE IF EXISTS `' . self::SCRATCH_DB . '`');
                $admin->close();
            }
        }

        parent::tearDown();
    }

    // --------------------------------------------------------------- seeding

    private function seedSession(): int
    {
        $this->school->table('academic_sessions')->insert([
            'name'       => '2026-2027',
            'start_date' => '2026-08-01',
            'end_date'   => '2027-07-31',
            'is_active'  => 1,
            'created_at' => '2026-08-01 00:00:00',
            'updated_at' => '2026-08-01 00:00:00',
        ]);

        return (int) $this->school->insertID();
    }

    private function seedInactiveSession(): int
    {
        $this->school->table('academic_sessions')->insert([
            'name'       => '1999-2000',
            'start_date' => '1999-08-01',
            'end_date'   => '2000-07-31',
            'is_active'  => 0,
            'created_at' => '1999-08-01 00:00:00',
            'updated_at' => '1999-08-01 00:00:00',
        ]);

        return (int) $this->school->insertID();
    }

    private function seedClass(): int
    {
        $this->school->table('classes')->insert([
            'name'         => 'Class 1',
            'numeric_code' => 1,
            'is_active'    => 1,
            'created_at'   => '2026-08-01 00:00:00',
            'updated_at'   => '2026-08-01 00:00:00',
        ]);

        return (int) $this->school->insertID();
    }

    private function seedSection(int $classId): int
    {
        $this->school->table('sections')->insert([
            'class_id'   => $classId,
            'name'       => 'A',
            'capacity'   => 30,
            'is_active'  => 1,
            'created_at' => '2026-08-01 00:00:00',
            'updated_at' => '2026-08-01 00:00:00',
        ]);

        return (int) $this->school->insertID();
    }

    private function seedStudent(): int
    {
        $this->school->table('students')->insert([
            'first_name'       => 'Ali',
            'last_name'        => 'Ahmed',
            'admission_number' => 'ADM-T-001',
            'date_of_birth'    => '2015-03-15',
            'gender'           => 'male',
            'status'           => 'active',
            'created_at'       => '2026-08-01 00:00:00',
            'updated_at'       => '2026-08-01 00:00:00',
        ]);

        return (int) $this->school->insertID();
    }

    private function seedEnrollment(int $studentId, int $classId, ?int $sectionId, int $sessionId): int
    {
        $this->school->table('enrollments')->insert([
            'student_id'          => $studentId,
            'class_id'            => $classId,
            'section_id'          => $sectionId,
            'academic_session_id' => $sessionId,
            'status'              => 'enrolled',
            'enrollment_date'     => '2026-08-01',
            'created_at'          => '2026-08-01 00:00:00',
            'updated_at'          => '2026-08-01 00:00:00',
        ]);

        return (int) $this->school->insertID();
    }

    /**
     * A school with a live session, a class, a section, a student and that
     * student enrolled - the minimum an attendance or fee write can resolve.
     *
     * @return array{sessionId:int, classId:int, sectionId:int, studentId:int}
     */
    private function seededSchool(): array
    {
        $sessionId = $this->seedSession();
        $classId   = $this->seedClass();
        $sectionId = $this->seedSection($classId);
        $studentId = $this->seedStudent();
        $this->seedEnrollment($studentId, $classId, $sectionId, $sessionId);

        return compact('sessionId', 'classId', 'sectionId', 'studentId');
    }

    private function attendanceRow(int $studentId): ?object
    {
        return $this->school->table('attendance')
            ->where('student_id', $studentId)
            ->get()
            ->getRow();
    }

    private function invoiceRow(int $invoiceId): ?object
    {
        return $this->school->table('fee_invoices')
            ->where('id', $invoiceId)
            ->get()
            ->getRow();
    }

    // ------------------------------------------------------- LB-2 attendance

    public function testAttendanceWriteFillsEveryNotNullColumn(): void
    {
        $ids = $this->seededSchool();

        $result = $this->service->markAttendance([
            'student_id'      => $ids['studentId'],
            'attendance_date' => '2026-10-21',
            'status'          => 'present',
        ]);

        $this->assertTrue($result['ok'], 'A fully scoped attendance write must succeed: ' . ($result['message'] ?? ''));

        $row = $this->attendanceRow($ids['studentId']);

        $this->assertNotNull($row, 'The attendance row must be written.');
        $this->assertSame($ids['sessionId'], (int) $row->academic_session_id);
        $this->assertSame($ids['classId'], (int) $row->class_id);
        $this->assertSame($ids['sectionId'], (int) $row->section_id);
        $this->assertSame(42, (int) $row->recorded_by, 'recorded_by must be the signed-in actor, not the school id.');
        $this->assertSame('present', $row->status);
        $this->assertSame('manual', $row->source);
    }

    public function testAttendanceWriteIsRefusedWithoutAnActiveSession(): void
    {
        $classId   = $this->seedClass();
        $sectionId = $this->seedSection($classId);
        $studentId = $this->seedStudent();

        // Only an archived session exists, so nothing is active.
        $archived = $this->seedInactiveSession();
        $this->seedEnrollment($studentId, $classId, $sectionId, $archived);

        $result = $this->service->markAttendance([
            'student_id'      => $studentId,
            'attendance_date' => '2026-10-21',
            'status'          => 'present',
        ]);

        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('academic session', $result['message']);
        $this->assertNull($this->attendanceRow($studentId), 'A refused write must leave no row behind.');
    }

    public function testAttendanceWriteIsRefusedForAnUnenrolledStudent(): void
    {
        $this->seedSession();
        $studentId = $this->seedStudent();

        $result = $this->service->markAttendance([
            'student_id'      => $studentId,
            'attendance_date' => '2026-10-21',
            'status'          => 'absent',
        ]);

        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('not enrolled', $result['message']);
        $this->assertNull($this->attendanceRow($studentId));
    }

    public function testAttendanceWriteRequiresASignedInActor(): void
    {
        $ids = $this->seededSchool();

        $anonymous = new SchoolRecordService($this->school, 7, null);

        $result = $anonymous->markAttendance([
            'student_id'      => $ids['studentId'],
            'attendance_date' => '2026-10-21',
            'status'          => 'present',
        ]);

        $this->assertFalse($result['ok'], 'recorded_by is NOT NULL, so a write with no actor must never reach the schema.');
        $this->assertNull($this->attendanceRow($ids['studentId']));
    }

    public function testSecondAttendanceWriteOnTheSameDayUpdatesInPlace(): void
    {
        $ids = $this->seededSchool();

        $first = $this->service->markAttendance([
            'student_id'      => $ids['studentId'],
            'attendance_date' => '2026-10-21',
            'status'          => 'absent',
        ]);

        $second = $this->service->markAttendance([
            'student_id'      => $ids['studentId'],
            'attendance_date' => '2026-10-21',
            'status'          => 'present',
        ]);

        $this->assertTrue($first['ok']);
        $this->assertTrue($second['ok']);
        $this->assertSame('Attendance updated', $second['message']);

        $count = (int) $this->school->table('attendance')->countAllResults();
        $this->assertSame(1, $count, 'The unique key is one row per student, session and date.');
        $this->assertSame('present', $this->attendanceRow($ids['studentId'])->status);
    }

    // -------------------------------------------------------- LB-4 fee invoices

    public function testFeeInvoiceResolvesSessionDueDateAndValidStatus(): void
    {
        $ids = $this->seededSchool();

        $result = $this->service->createFeeInvoice([
            'student_id' => $ids['studentId'],
            'fee_head'   => 'Tuition Fee Q1',
            'amount'     => 5000,
        ]);

        $this->assertTrue($result['ok'], 'Invoice creation must succeed: ' . ($result['message'] ?? ''));

        $row = $this->invoiceRow((int) $result['id']);

        $this->assertNotNull($row);
        $this->assertSame($ids['sessionId'], (int) $row->academic_session_id, 'academic_session_id is NOT NULL.');
        $this->assertNotEmpty((string) $row->due_date, 'due_date is NOT NULL.');
        $this->assertSame('due', $row->status, "'unpaid' is not a member of the due/partial/paid/overdue ENUM.");
        $this->assertSame(5000.0, (float) $row->amount);
    }

    public function testFeeInvoiceRefusedWithoutAnActiveSession(): void
    {
        $studentId = $this->seedStudent();

        $result = $this->service->createFeeInvoice([
            'student_id' => $studentId,
            'fee_head'   => 'Tuition Fee Q1',
            'amount'     => 5000,
        ]);

        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('academic session', $result['message']);

        $this->assertSame(0, (int) $this->school->table('fee_invoices')->countAllResults());
    }

    public function testReceiptLeavesTheInvoicePartiallyPaidUntilSettled(): void
    {
        $ids = $this->seededSchool();

        $invoice = $this->service->createFeeInvoice([
            'student_id' => $ids['studentId'],
            'fee_head'   => 'Tuition Fee Q1',
            'amount'     => 5000,
            'due_date'   => '2026-11-15',
        ]);

        $this->assertTrue($invoice['ok']);
        $invoiceId = (int) $invoice['id'];

        $part = $this->service->recordReceipt([
            'invoice_id'   => $invoiceId,
            'amount_paid'  => 2000,
            'payment_mode' => 'cash',
        ]);

        $this->assertTrue($part['ok'], 'A part payment must be recordable: ' . ($part['message'] ?? ''));
        $this->assertSame('partial', $this->invoiceRow($invoiceId)->status);

        $rest = $this->service->recordReceipt([
            'invoice_id'   => $invoiceId,
            'amount_paid'  => 3000,
            'payment_mode' => 'cash',
        ]);

        $this->assertTrue($rest['ok']);
        $this->assertSame('paid', $this->invoiceRow($invoiceId)->status, 'Only a fully settled invoice becomes paid.');
    }

    public function testReceiptCannotOverpayAnInvoice(): void
    {
        $ids = $this->seededSchool();

        $invoice = $this->service->createFeeInvoice([
            'student_id' => $ids['studentId'],
            'fee_head'   => 'Tuition Fee Q1',
            'amount'     => 5000,
        ]);

        $result = $this->service->recordReceipt([
            'invoice_id'   => (int) $invoice['id'],
            'amount_paid'  => 9999,
            'payment_mode' => 'cash',
        ]);

        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('larger than the invoice', $result['message']);
    }
}
