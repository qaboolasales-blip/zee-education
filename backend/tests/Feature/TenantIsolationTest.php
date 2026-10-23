<?php

namespace Tests\Feature;

use App\Libraries\CredentialVault;
use App\Libraries\HostResolver;
use App\Libraries\SchoolAccessService;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Tenant isolation boundaries.
 *
 * Two things are proved here that everything else depends on:
 *
 *  1. A school's database password is never stored in a form an attacker could
 *     replay, and no API path can ask for it back.
 *  2. An unverified or unknown Host header resolves to NOTHING. There is no
 *     default-school fallback, so a forged Host cannot reach another tenant.
 *
 * @internal
 */
final class TenantIsolationTest extends CIUnitTestCase
{
    private const SCHOOL = 999902;

    private CredentialVault $vault;

    private HostResolver $hosts;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vault  = new CredentialVault();
        $this->hosts = new HostResolver();

        $this->clean();
    }

    protected function tearDown(): void
    {
        $this->clean();

        parent::tearDown();
    }

    private function clean(): void
    {
        $db = \Config\Database::connect();

        $db->table('school_db_credentials')->where('school_id', self::SCHOOL)->delete();
        $db->table('school_domains')->where('school_id', self::SCHOOL)->delete();
        $db->table('schools')->where('id', self::SCHOOL)->delete();

        // school_code carries a UNIQUE index (migration 000007), so leftovers
        // from an interrupted run must be cleared by code as well as by id.
        $db->table('school_domains')->whereIn('school_id', function ($q) use ($db): void {
            $q->select('id')->from('schools')->where('school_code', 'ISOTEST');
        }, false)->delete();

        $db->table('schools')->whereIn('school_code', ['ISOTEST', 'ISOTEST2'])->delete();
    }

    private function makeSchool(string $name = 'Isolation Test School', string $code = 'ISOTEST'): int
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('schools')->insert([
            'name'         => $name,
            'status'       => 'active',
            'plan_code'    => 'starter',
            'school_code'  => $code,
            'timezone'     => 'Asia/Karachi',
            'currency'     => 'PKR',
            'locale'       => 'en',
            'contact_email' => 'isolation@example.test',
            'contact_phone' => '0000000000',
            'address'      => '',
            'created_at'   => $now,
            'updated_at'   => $now,
        ]);

        return (int) $db->insertID();
    }

    // -----------------------------------------------------------------
    // credential storage
    // -----------------------------------------------------------------

    public function testPasswordIsStoredEncryptedNotPlaintext(): void
    {
        $this->makeSchool();

        $secret = 'SuperSecret-DB-Passw0rd!';

        $this->vault->save(self::SCHOOL, [
            'database' => 'test_school_db',
            'username' => 'test_school_user',
            'password' => $secret,
        ]);

        $stored = \Config\Database::connect()
            ->table('school_db_credentials')
            ->where('school_id', self::SCHOOL)
            ->get()
            ->getRow();

        $this->assertNotNull($stored);
        $this->assertNotSame($secret, $stored->db_password_enc);
        $this->assertStringNotContainsString($secret, json_encode($stored));
    }

    public function testSavedPasswordCanBeUsedToAuthenticate(): void
    {
        $this->makeSchool();

        // Use the real test database credentials so a live connection is proved.
        $tests = config('Database')->tests;

        $this->vault->save(self::SCHOOL, [
            'hostname' => $tests['hostname'],
            'port'     => $tests['port'],
            'database' => $tests['database'],
            'username' => $tests['username'],
            'password' => (string) $tests['password'],
        ]);

        $conn = $this->vault->connect(self::SCHOOL);

        $this->assertNotNull($conn, 'A decrypted password must actually reach MySQL.');
        // The connection working at all is the proof: the password had to be
        // decrypted correctly to authenticate. MySQLi returns values as
        // strings, hence the cast rather than a strict identity check.
        $this->assertSame(1, (int) $conn->query('SELECT 1 AS ok')->getRow()->ok);

        // And a successful connect is recorded for the operator.
        $this->assertSame('verified', $this->vault->describe(self::SCHOOL)['status']);
    }

    public function testWrongPasswordFailsClosedWithoutLeakingTheSecret(): void
    {
        $this->makeSchool();

        $tests = config('Database')->tests;

        $this->vault->save(self::SCHOOL, [
            'database' => $tests['database'],
            'username' => $tests['username'],
            'password' => 'definitely-not-the-password',
        ]);

        $this->assertNull($this->vault->connect(self::SCHOOL), 'A bad password must not produce a connection.');

        $described = $this->vault->describe(self::SCHOOL);

        $this->assertSame('failed', $described['status']);
        // describe() must never hand back the password or its ciphertext.
        $this->assertArrayNotHasKey('password', $described);
        $this->assertArrayNotHasKey('db_password_enc', $described);
    }

    public function testDescribeReturnsNoSecretMaterial(): void
    {
        $this->makeSchool();

        $this->vault->save(self::SCHOOL, [
            'database' => 'some_school_db',
            'username' => 'some_user',
            'password' => 'hunter2',
        ]);

        $described = $this->vault->describe(self::SCHOOL);

        $this->assertSame('some_school_db', $described['database']);
        $this->assertSame('some_user', $described['username']);
        $this->assertStringNotContainsString('hunter2', json_encode($described));
    }

    public function testSavingTwiceReplacesRatherThanDuplicating(): void
    {
        $this->makeSchool();

        $this->vault->save(self::SCHOOL, ['database' => 'a_db', 'username' => 'u1', 'password' => 'p1']);
        $this->vault->save(self::SCHOOL, ['database' => 'b_db', 'username' => 'u2', 'password' => 'p2']);

        $rows = \Config\Database::connect()->table('school_db_credentials')
            ->where('school_id', self::SCHOOL)
            ->get()
            ->getResultArray();

        $this->assertCount(1, $rows);
        $this->assertSame('b_db', $rows[0]['db_name']);
        $this->assertSame('u2', $rows[0]['db_username']);
    }

    // -----------------------------------------------------------------
    // domain binding
    // -----------------------------------------------------------------

    public function testVerifiedDomainResolvesToItsSchool(): void
    {
        $id = $this->makeSchool();

        $this->hosts->attachDomain($id, 'verified-school.example', true, true);

        $found = $this->hosts->schoolForHost('verified-school.example');

        $this->assertNotNull($found);
        $this->assertSame($id, (int) $found->id);
    }

    public function testUnverifiedDomainDoesNotResolve(): void
    {
        $id = $this->makeSchool();

        // Domain is on file but DNS has not been confirmed by the operator.
        $this->hosts->attachDomain($id, 'pending-school.example', true, false);

        $this->assertNull(
            $this->hosts->schoolForHost('pending-school.example'),
            'An unverified domain must never resolve to a school.'
        );
    }

    public function testUnknownHostResolvesToNothingAndNeverFallsBack(): void
    {
        $id = $this->makeSchool();
        $this->hosts->attachDomain($id, 'real-school.example', true, true);

        // A forged Host header. It must not reach ANY school.
        $this->assertNull($this->hosts->schoolForHost('attacker-controlled.example'));
        $this->assertNull($this->hosts->schoolForHost('real-school.example.evil.com'));
        $this->assertNull($this->hosts->schoolForHost(''));
        $this->assertNull($this->hosts->schoolForHost('localhost'));
    }

    public function testHostMatchingIsCaseInsensitive(): void
    {
        $id = $this->makeSchool();

        $this->hosts->attachDomain($id, 'Mixed-Case.Example', true, true);

        $this->assertNotNull($this->hosts->schoolForHost('mixed-case.example'));
        $this->assertNotNull($this->hosts->schoolForHost('MIXED-CASE.EXAMPLE'));
    }

    public function testHostWithPortIsNormalised(): void
    {
        $id = $this->makeSchool();

        $this->hosts->attachDomain($id, 'porty-school.example', true, true);

        $this->assertNotNull($this->hosts->schoolForHost('porty-school.example:8080'));
    }

    public function testHostileHostHeaderIsRejectedNotSanitised(): void
    {
        $id = $this->makeSchool();

        $this->hosts->attachDomain($id, 'safe.example', true, true);

        $_SERVER['HTTP_HOST'] = "safe.example\r\nX-Injected: 1";

        // The resolver must return an empty string rather than a usable host.
        $this->assertSame('', $this->hosts->currentHost());
        $this->assertNull($this->hosts->schoolForHost("safe.example\r\nX-Injected: 1"));

        unset($_SERVER['HTTP_HOST']);
    }

    public function testAdminHostNeverResolvesToASchool(): void
    {
        $id = $this->makeSchool();

        // Deliberately give a school the same domain the platform would use.
        $this->hosts->attachDomain($id, 'platform-console.example', true, true);

        // Without ZEE_ADMIN_HOST configured, host lookup still works...
        $this->assertNotNull($this->hosts->schoolForHost('platform-console.example'));

        // ...but once the admin host is declared it is excluded from schools.
        putenv('ZEE_ADMIN_HOST=platform-console.example');
        $_ENV['ZEE_ADMIN_HOST'] = 'platform-console.example';

        $this->assertTrue($this->hosts->isAdminRequest('platform-console.example'));
        $this->assertNull(
            $this->hosts->schoolForHost('platform-console.example'),
            'The platform console host must never be treated as a school domain.'
        );

        putenv('ZEE_ADMIN_HOST');
        unset($_ENV['ZEE_ADMIN_HOST']);
    }

    // -----------------------------------------------------------------
    // user-typed domain normalisation (connect screen)
    // -----------------------------------------------------------------

    public function testNormaliseAcceptsReasonableInput(): void
    {
        $this->assertSame('school.example.com', $this->hosts->normaliseDomain('school.example.com'));
        $this->assertSame('school.example.com', $this->hosts->normaliseDomain('  School.Example.com  '));
        $this->assertSame('school.example.com', $this->hosts->normaliseDomain('https://school.example.com/login'));
        $this->assertSame('school.example.com', $this->hosts->normaliseDomain('school.example.com:8080'));
        $this->assertSame('school.example.com', $this->hosts->normaliseDomain('school.example.com.'));
    }

    public function testNormaliseRejectsRubbish(): void
    {
        foreach (['', '   ', 'not a domain', 'localhost', 'http://', 'a b.com', '<script>', '../../etc'] as $bad) {
            $this->assertNull(
                $this->hosts->normaliseDomain($bad),
                'Input must be rejected before it reaches any lookup: ' . var_export($bad, true)
            );
        }
    }

    // -----------------------------------------------------------------
    // school database resolution (tenant DB never falls back silently)
    // -----------------------------------------------------------------

    public function testDatabaseResolutionPrefersTheServerSideMap(): void
    {
        $this->assertSame(
            'host_provisioned_db',
            SchoolAccessService::resolveDatabaseName('demo', 'demo=host_provisioned_db', 'ignored_', 'default_db', 5)
        );
    }

    public function testDatabaseResolutionFallsBackToTheProvisioningPrefix(): void
    {
        // The access path must derive the SAME name provisioning created.
        $this->assertSame(
            'zi_school_demo',
            SchoolAccessService::resolveDatabaseName('demo', '', 'zi_school_', 'default_db', 5)
        );
    }

    public function testDatabaseResolutionAllowsDefaultOnlyForOneSchool(): void
    {
        $this->assertSame('default_db', SchoolAccessService::resolveDatabaseName('demo', '', '', 'default_db', 1));
        $this->assertNull(
            SchoolAccessService::resolveDatabaseName('demo', '', '', 'default_db', 2),
            'Several schools without a map or prefix must fail closed, never share the default database.'
        );
    }

    public function testDatabaseResolutionRejectsUnsafeInput(): void
    {
        $this->assertNull(SchoolAccessService::resolveDatabaseName('bad-code', '', 'zi_', 'default_db', 1));
        $this->assertNull(SchoolAccessService::resolveDatabaseName('demo', 'demo=bad-name', '', '', 1));
        $this->assertNull(SchoolAccessService::resolveDatabaseName('demo', '', 'bad-prefix', '', 1));
    }

    public function testConnectionFailsClosedWhenSeveralSchoolsHaveNoDatabaseName(): void
    {
        $first  = $this->makeSchool();
        $this->makeSchool('Second Isolation School', 'ISOTEST2');

        $oldMap    = $_ENV['ZEE_SCHOOL_DB_MAP'] ?? null;
        $oldPrefix = $_ENV['ZEE_SCHOOL_DB_PREFIX'] ?? null;

        putenv('ZEE_SCHOOL_DB_MAP=');
        putenv('ZEE_SCHOOL_DB_PREFIX=');
        $_ENV['ZEE_SCHOOL_DB_MAP']    = '';
        $_ENV['ZEE_SCHOOL_DB_PREFIX'] = '';

        try {
            $access = new SchoolAccessService();

            $this->assertNull(
                $access->databaseNameForSchool($first),
                'With two schools and no mapping, no database name may be inferred.'
            );
            $this->assertNull(
                $access->connectionForSchoolId($first),
                'A school without a resolvable database must not fall back to another tenant database.'
            );
        } finally {
            if ($oldMap === null) {
                putenv('ZEE_SCHOOL_DB_MAP');
                unset($_ENV['ZEE_SCHOOL_DB_MAP']);
            } else {
                putenv('ZEE_SCHOOL_DB_MAP=' . $oldMap);
                $_ENV['ZEE_SCHOOL_DB_MAP'] = $oldMap;
            }

            if ($oldPrefix === null) {
                putenv('ZEE_SCHOOL_DB_PREFIX');
                unset($_ENV['ZEE_SCHOOL_DB_PREFIX']);
            } else {
                putenv('ZEE_SCHOOL_DB_PREFIX=' . $oldPrefix);
                $_ENV['ZEE_SCHOOL_DB_PREFIX'] = $oldPrefix;
            }
        }
    }

    public function testConnectionUsesProvisioningPrefixForTheSchoolCode(): void
    {
        $id = $this->makeSchool();

        $oldPrefix = $_ENV['ZEE_SCHOOL_DB_PREFIX'] ?? null;

        putenv('ZEE_SCHOOL_DB_MAP=');
        putenv('ZEE_SCHOOL_DB_PREFIX=iso_prefix_');
        $_ENV['ZEE_SCHOOL_DB_MAP']    = '';
        $_ENV['ZEE_SCHOOL_DB_PREFIX'] = 'iso_prefix_';

        try {
            $this->assertSame(
                'iso_prefix_isotest',
                (new SchoolAccessService())->databaseNameForSchool($id)
            );
        } finally {
            if ($oldPrefix === null) {
                putenv('ZEE_SCHOOL_DB_PREFIX');
                unset($_ENV['ZEE_SCHOOL_DB_PREFIX']);
            } else {
                putenv('ZEE_SCHOOL_DB_PREFIX=' . $oldPrefix);
                $_ENV['ZEE_SCHOOL_DB_PREFIX'] = $oldPrefix;
            }
        }
    }
}