<?php

namespace Tests\Feature;

use App\Libraries\SchoolProvisioningService;
use CodeIgniter\Shield\Models\UserModel;
use CodeIgniter\Shield\Test\AuthenticationTesting;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;
use Tests\Support\CsrfTokenTrait;

/**
 * RB-4 / C-C-03: provisioning idempotency, asserted as behaviour.
 *
 * Three guarantees are pinned here:
 *
 *   1. The DATABASE rejects a duplicated job idempotency key (migration
 *      000016, unique index uq_provisioning_jobs_idempotency_key).
 *   2. The provision entry point refuses a second school with the same code
 *      (409) and never creates a second row.
 *   3. Re-provisioning a school that is already completed is a no-op that
 *      reports "Already provisioned" instead of running the pipeline again.
 *
 * Schema rows: provisioning_jobs may hold many historical jobs for one
 * target database (install today, migrate on every release), so uniqueness
 * lives on the caller-supplied idempotency key, not on target_database.
 *
 * @internal
 */
final class ProvisioningIdempotencyTest extends CIUnitTestCase
{
    use FeatureTestTrait;
    use AuthenticationTesting;
    use CsrfTokenTrait;

    /** A school id that no real installation uses. */
    private const SCHOOL = 999921;

    /** A second school id for the already-provisioned case. */
    private const SCHOOL_READY = 999922;

    /** A user id that no real installation uses. */
    private const USER = 999921;

    private const CODE = 'rbidem01';

    /** Code used by the create-then-refuse sequence. */
    private const CODE_CREATE = 'rbxcreate01';

    private const PASSWORD = 'Provisioning-Idem-Passw0rd!';

    protected function setUp(): void
    {
        parent::setUp();

        $this->clean();
        $this->makeSchool(self::SCHOOL, self::CODE, 'requested');
    }

    protected function tearDown(): void
    {
        $this->clean();

        \Config\Services::resetSingle('auth');
        $_SESSION = [];

        parent::tearDown();
    }

    private function clean(): void
    {
        $db = \Config\Database::connect();

        $db->table('provisioning_jobs')->where('school_id', self::SCHOOL)->delete();
        $db->table('provisioning_jobs')->where('school_id', self::SCHOOL_READY)->delete();
        $db->table('user_school_access')->where('user_id', self::USER)->delete();
        $db->table('auth_groups_users')->where('user_id', self::USER)->delete();
        $db->table('auth_identities')->where('user_id', self::USER)->delete();
        $db->table('users')->where('id', self::USER)->delete();
        $db->table('schools')->where('id', self::SCHOOL)->delete();
        $db->table('schools')->where('id', self::SCHOOL_READY)->delete();
        $db->table('schools')->where('school_code', self::CODE)->delete();
        $db->table('schools')->where('school_code', self::CODE_CREATE)->delete();
        $db->table('schools')->where('school_code', 'rbready01')->delete();
    }

    private function makeSchool(int $id, string $code, string $state): void
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('schools')->insert([
            'id'                  => $id,
            'name'                => 'RB-4 Idempotency Fixture',
            'status'              => 'active',
            'school_code'         => $code,
            'timezone'            => 'Asia/Karachi',
            'currency'            => 'PKR',
            'locale'              => 'en',
            'installation_state'  => $state,
            'installation_status' => $state,
            'created_at'          => $now,
            'updated_at'          => $now,
        ]);
    }

    private function makeUser(): void
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('users')->insert([
            'id'         => self::USER,
            'username'   => 'rb4_idempotency_tester',
            'status'     => 'active',
            'active'     => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $db->table('auth_identities')->insert([
            'user_id'    => self::USER,
            'type'       => 'email_password',
            'name'       => 'rb4@example.test',
            'secret'     => password_hash(self::PASSWORD, PASSWORD_DEFAULT),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $db->table('auth_groups_users')->insert([
            'user_id'    => self::USER,
            'group'      => 'superadmin',
            'created_at' => $now,
        ]);

        $model = model(UserModel::class)->findById(self::USER);
        $this->assertNotNull($model, 'The test super admin must exist before sign-in.');

        $this->actingAs($model);
    }

    /**
     * @return array<array-key, mixed>
     */
    private function body(\CodeIgniter\Test\TestResponse $result): array
    {
        $body = json_decode((string) $result->response()->getBody(), true);

        $this->assertIsArray($body, 'The API must answer with a JSON document.');

        return $body;
    }

    // -----------------------------------------------------------------
    // 1. database-level guard (migration 000016)
    // -----------------------------------------------------------------

    public function testIdempotencyKeyColumnAndUniqueIndexExist(): void
    {
        $db = \Config\Database::connect();

        $column = $db->query("SHOW COLUMNS FROM provisioning_jobs LIKE 'idempotency_key'")->getRow();
        $this->assertNotNull($column, 'provisioning_jobs must carry the idempotency_key column.');

        $index = $db->query(
            "SHOW INDEX FROM provisioning_jobs WHERE Key_name = 'uq_provisioning_jobs_idempotency_key'"
        )->getRow();

        $this->assertNotNull($index, 'The idempotency key must be backed by a named unique index.');
        $this->assertSame('0', (string) $index->Non_unique, 'The index must be UNIQUE.');
        $this->assertSame('idempotency_key', $index->Column_name);
    }

    public function testDuplicateIdempotencyKeyIsRejectedByTheDatabase(): void
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');
        $key = 'install:' . self::SCHOOL;

        $row = [
            'school_id'        => self::SCHOOL,
            'type'             => 'install',
            'status'           => 'pending',
            'target_database'  => 'zi_school_' . self::CODE,
            'idempotency_key'  => $key,
            'created_at'       => $now,
        ];

        $db->table('provisioning_jobs')->insert($row);

        try {
            $db->table('provisioning_jobs')->insert($row);
            $this->fail('A duplicated idempotency key must be rejected by the database itself.');
        } catch (\Throwable $e) {
            $this->assertStringContainsString('Duplicate', $e->getMessage());
        }

        $count = $db->table('provisioning_jobs')
            ->where('idempotency_key', $key)
            ->countAllResults();

        $this->assertSame(1, $count, 'Exactly one job row may exist for an idempotency key.');
    }

    public function testJobRowsWithoutAKeyRemainPossible(): void
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');
        $db->table('provisioning_jobs')->where('target_database', 'zi_school_nullkey')->delete();

        foreach ([1, 2] as $attempt) {
            $db->table('provisioning_jobs')->insert([
                'school_id'       => self::SCHOOL,
                'type'            => 'migrate',
                'status'          => 'completed',
                'target_database' => 'zi_school_nullkey',
                'attempts'        => $attempt,
                'created_at'      => $now,
            ]);
        }

        $count = $db->table('provisioning_jobs')
            ->where('target_database', 'zi_school_nullkey')
            ->countAllResults();

        $this->assertSame(
            2,
            $count,
            'MySQL allows repeated NULLs in a UNIQUE index, so keyless placeholder rows are not blocked.'
        );
    }

    // -----------------------------------------------------------------
    // 2. duplicate school code cannot create a second school
    // -----------------------------------------------------------------

    public function testDuplicateSchoolCodeIsRefusedAndOnlyOneSchoolRemains(): void
    {
        $this->makeUser();

        $first = $this->withCsrf()->withBodyFormat('json')->post('/admin/schools', [
            'name'        => 'RB-4 First Provision',
            'school_code' => self::CODE_CREATE,
        ]);

        $db   = \Config\Database::connect();
        $rows = $db->table('schools')->where('school_code', self::CODE_CREATE)->countAllResults();
        $this->assertSame(
            1,
            $rows,
            'The first call must create the school (status was ' . $first->response()->getStatusCode() . ').'
        );

        $second = $this->withCsrf()->withBodyFormat('json')->post('/admin/schools', [
            'name'        => 'RB-4 Second Provision',
            'school_code' => self::CODE_CREATE,
        ]);

        $this->assertSame(409, $second->response()->getStatusCode());

        $body = $this->body($second);
        $this->assertFalse($body['ok']);
        $this->assertSame('That school code is already in use', $body['message']);

        $rows = $db->table('schools')->where('school_code', self::CODE_CREATE)->countAllResults();
        $this->assertSame(1, $rows, 'A retry must never create a second school row.');
    }

    // -----------------------------------------------------------------
    // 3. retrying a completed provision is a no-op (SC-2 semantics)
    // -----------------------------------------------------------------

    public function testProvisioningACompletedSchoolReportsAlreadyProvisioned(): void
    {
        $this->makeSchool(self::SCHOOL_READY, 'rbready01', SchoolProvisioningService::STATE_READY);

        $service = new SchoolProvisioningService();
        $result  = $service->provisionSchool(self::SCHOOL_READY, []);

        $this->assertTrue($result['success'] === true, 'A completed school must not fail a retry.');
        $this->assertSame(SchoolProvisioningService::STATE_READY, $result['state']);
        $this->assertSame('Already provisioned', $result['message'] ?? null);

        $db    = \Config\Database::connect();
        $state = $db->table('schools')
            ->select('installation_state')
            ->where('id', self::SCHOOL_READY)
            ->get()
            ->getRow()
            ->installation_state;

        $this->assertSame(
            SchoolProvisioningService::STATE_READY,
            $state,
            'The retry must not move a completed school out of its state.'
        );
    }
}
