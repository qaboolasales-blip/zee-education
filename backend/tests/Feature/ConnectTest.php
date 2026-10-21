<?php

namespace Tests\Feature;

use App\Libraries\InviteService;
use App\Libraries\QrRenderer;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * The QR / manual connect flow.
 *
 * The point of these tests is that an invite is a ROUTING HINT and nothing
 * more: it must not be usable as a credential, must not survive its own expiry,
 * and must never reveal which school it belongs to.
 *
 * @internal
 */
final class ConnectTest extends CIUnitTestCase
{
    private const SCHOOL = 999903;

    private InviteService $invites;

    protected function setUp(): void
    {
        parent::setUp();

        $this->invites = new InviteService();

        $db = \Config\Database::connect();

        $db->table('school_invites')->where('school_id', self::SCHOOL)->delete();
        $db->table('school_domains')->where('school_id', self::SCHOOL)->delete();
        $db->table('schools')->where('id', self::SCHOOL)->delete();
        $db->table('schools')->where('school_code', 'CONNTEST')->delete();
    }

    protected function tearDown(): void
    {
        $this->setUpState();

        parent::tearDown();
    }

    private function setUpState(): void
    {
        $db = \Config\Database::connect();

        $db->table('school_invites')->where('school_id', self::SCHOOL)->delete();
        $db->table('school_domains')->where('school_id', self::SCHOOL)->delete();
        $db->table('schools')->where('id', self::SCHOOL)->delete();
        $db->table('schools')->where('school_code', 'CONNTEST')->delete();
    }

    private function makeSchool(): int
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('schools')->insert([
            'name'          => 'Connect Test School',
            'status'        => 'active',
            'plan_code'     => 'starter',
            'school_code'   => 'CONNTEST',
            'timezone'      => 'Asia/Karachi',
            'currency'      => 'PKR',
            'locale'        => 'en',
            'contact_email' => 'connect@example.test',
            'contact_phone' => '0000000000',
            'address'       => '',
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

        return (int) $db->insertID();
    }

    // -----------------------------------------------------------------
    // token handling
    // -----------------------------------------------------------------

    public function testTokenIsStoredOnlyAsAHash(): void
    {
        $this->makeSchool();

        $invite = $this->invites->create(self::SCHOOL);

        $row = \Config\Database::connect()->table('school_invites')
            ->where('id', $invite['id'])
            ->get()
            ->getRow();

        $this->assertNotSame($invite['token'], $row->token_hash);
        $this->assertSame(hash('sha256', $invite['token']), $row->token_hash);
        $this->assertStringNotContainsString($invite['token'], json_encode($row));
    }

    public function testTokenIsLongAndUrlSafe(): void
    {
        $this->makeSchool();

        $invite = $this->invites->create(self::SCHOOL);

        // 32 random bytes base64url-encoded: unguessable and safe inside a URL.
        $this->assertGreaterThanOrEqual(40, strlen($invite['token']));
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9\-_]+$/', $invite['token']);
    }

    public function testTwoInvitesAreNeverTheSame(): void
    {
        $this->makeSchool();

        $seen = [];

        for ($i = 0; $i < 15; $i++) {
            $token = $this->invites->create(self::SCHOOL)['token'];
            $this->assertArrayNotHasKey($token, $seen);
            $seen[$token] = true;
        }
    }

    // -----------------------------------------------------------------
    // lifetime - the core guarantee
    // -----------------------------------------------------------------

    public function testFreshInviteIsUsable(): void
    {
        $this->makeSchool();

        $invite = $this->invites->create(self::SCHOOL);

        $this->assertNotNull($this->invites->peek($invite['token']));
        $this->assertNotNull($this->invites->consume($invite['token']));
    }

    public function testExpiredInviteIsRejected(): void
    {
        $this->makeSchool();

        $invite = $this->invites->create(self::SCHOOL, 'connect', ['ttl_minutes' => 10]);

        // Move its expiry into the past the way time would.
        \Config\Database::connect()->table('school_invites')
            ->where('id', $invite['id'])
            ->update(['expires_at' => date('Y-m-d H:i:s', strtotime('-1 second'))]);

        $this->assertNull($this->invites->peek($invite['token']));
        $this->assertNull($this->invites->consume($invite['token']));
    }

    public function testSingleUseInviteCannotBeReplayed(): void
    {
        $this->makeSchool();

        $invite = $this->invites->create(self::SCHOOL, 'connect', ['max_uses' => 1]);

        $this->assertNotNull($this->invites->consume($invite['token']));

        // A photographed QR must stop working the moment it is used once.
        $this->assertNull($this->invites->consume($invite['token']));
        $this->assertNull($this->invites->peek($invite['token']));
    }

    public function testMultiUseInviteStopsAtItsLimit(): void
    {
        $this->makeSchool();

        $invite = $this->invites->create(self::SCHOOL, 'connect', ['max_uses' => 3]);

        for ($i = 0; $i < 3; $i++) {
            $this->assertNotNull($this->invites->consume($invite['token']), "use {$i} should succeed");
        }

        $this->assertNull($this->invites->consume($invite['token']));
    }

    public function testRevokedInviteStopsImmediately(): void
    {
        $this->makeSchool();

        $invite = $this->invites->create(self::SCHOOL);

        $this->assertTrue($this->invites->revoke($invite['id']));

        $this->assertNull($this->invites->peek($invite['token']));
        $this->assertNull($this->invites->consume($invite['token']));
    }

    public function testRevokeAllCoversEveryLiveInvite(): void
    {
        $this->makeSchool();

        $a = $this->invites->create(self::SCHOOL);
        $b = $this->invites->create(self::SCHOOL);

        $this->assertSame(2, $this->invites->revokeAllForSchool(self::SCHOOL));

        $this->assertNull($this->invites->peek($a['token']));
        $this->assertNull($this->invites->peek($b['token']));
    }

    public function testGarbageTokenIsRejectedNotErrored(): void
    {
        $this->assertNull($this->invites->peek(''));
        $this->assertNull($this->invites->peek('not-a-real-token'));
        $this->assertNull($this->invites->consume(str_repeat('A', 500)));
    }

    // -----------------------------------------------------------------
    // payload
    // -----------------------------------------------------------------

    public function testQrPayloadCarriesNoIdentity(): void
    {
        $payload = $this->invites->qrPayload('school.example.com', 'sometoken');

        $this->assertSame('school.example.com#c=sometoken', $payload);

        // It must not smuggle a school id, user id or role.
        $this->assertStringNotContainsString('school_id', $payload);
        $this->assertStringNotContainsString('user_id', $payload);
        $this->assertStringNotContainsString('role', $payload);
        $this->assertStringNotContainsString('password', $payload);
    }

    public function testQrPayloadRefusesAnInvalidHost(): void
    {
        $this->expectException(\RuntimeException::class);

        $this->invites->qrPayload('not a host', 'token');
    }

    public function testQrRendersRealSvgWithoutAnyImageExtension(): void
    {
        $svg = (new QrRenderer())->svg('school.example.com#c=abc123', 240);

        $this->assertStringContainsString('<svg', $svg);

        // A real QR is a grid of drawn modules; an empty or error placeholder
        // would contain no path data at all.
        $this->assertStringContainsString('<path', $svg);
        $this->assertGreaterThan(500, strlen($svg));
        // The renderer emits one path made of many filled rectangles (each module
        // is a "M..Z" sub-path). A placeholder would contain none of these.
        $this->assertGreaterThan(50, substr_count($svg, 'ZM'));
    }

    public function testQrRendererNeedsNoGdOrImagick(): void
    {
        // Shared hosting has neither extension, and the CI runner has both, so
        // asserting on this machine's php.ini is environment-dependent and
        // wrong (it fails wherever imagick happens to be loaded). The real
        // guarantee is that the code path never reaches an image writer:
        // endroid/qr-code only touches GD/Imagick through those writer classes,
        // and QrRenderer references none of them.
        $source = (string) file_get_contents(ROOTPATH . 'app/Libraries/QrRenderer.php');

        $this->assertStringNotContainsString('PngWriter', $source);
        $this->assertStringNotContainsString('JpgWriter', $source);
        $this->assertStringNotContainsString('WebpWriter', $source);

        $svg = (new QrRenderer())->svg('x', 120);

        $this->assertStringContainsString('<svg', $svg);
    }

    // -----------------------------------------------------------------
    // the real defence: an invite is not a credential
    // -----------------------------------------------------------------

    public function testInviteAloneGrantsNoDataAccess(): void
    {
        $this->makeSchool();

        $invite = $this->invites->create(self::SCHOOL);

        // Consuming an invite yields only the invite row itself. There is no
        // method anywhere that turns an invite into a session or a school
        // binding - that is the point of the design.
        $row = $this->invites->consume($invite['token']);

        $this->assertIsObject($row);

        // The class exposes no API that grants access from a token.
        $api = get_class_methods(InviteService::class);

        $this->assertNotContains('login', $api);
        $this->assertNotContains('authenticate', $api);
        $this->assertNotContains('grantAccess', $api);

        foreach ($api as $method) {
            $this->assertStringNotContainsString('login', strtolower($method));
        }
    }
}