<?php

namespace Tests\Feature;

use CodeIgniter\Exceptions\PageNotFoundException;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * Tests for GET /setup.
 *
 * Covers the M1.2 acceptance criteria:
 *   - renders successfully
 *   - explains what the future installer will collect
 *   - writes NOTHING to the database
 *   - accepts no credentials
 */
class SetupTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    protected $mocks = [];

    /**
     * Snapshot the control-plane table list so we can prove the
     * placeholder performs no write of any kind.
     *
     * @return list<string>
     */
    private function tableNames(): array
    {
        // Explicitly use the `tests` group so this assertion can never
        // touch the real control-plane database.
        $db = \Config\Database::connect('tests', false);

        if ($db === null) {
            $this->fail('The `tests` database group is not configured.');
        }

        $out = [];

        foreach ($db->listTables() as $table) {
            $out[] = (string) $table;
        }

        $db->close();

        sort($out);

        return $out;
    }

    public function testSetupRenders(): void
    {
        $result = $this->get('setup');

        $result->assertOK();
        $result->assertSee('School Installer');
    }

    public function testSetupReturnsHtml(): void
    {
        $result = $this->get('setup');

        $result->assertHeader('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * The placeholder must clearly state that nothing is installed yet.
     */
    public function testSetupDisclosesThatItIsAPlaceholder(): void
    {
        $result = $this->get('setup');

        $result->assertSee('Placeholder');
        $result->assertSee('does not install anything');
    }

    /**
     * The placeholder must state the two data guarantees the product
     * depends on: dedicated database per school, and data-safe licensing.
     */
    public function testSetupStatesIsolationGuarantees(): void
    {
        $result = $this->get('setup');

        $result->assertSee('dedicated database');
        $result->assertSee('never treated as authorization');
        $result->assertSee('export');
    }

    public function testSetupShowsPlatformIdentity(): void
    {
        $result = $this->get('setup');

        $result->assertSee('Zee Education');
        $result->assertSee('Asia/Karachi');
        $result->assertSee('PKR');
    }

    /**
     * CRITICAL: the placeholder must not create or alter any table.
     */
    public function testSetupWritesNothingToTheDatabase(): void
    {
        $before = $this->tableNames();

        $this->get('setup')->assertOK();

        $after = $this->tableNames();

        $this->assertSame(
            $before,
            $after,
            'The /setup placeholder must not create, alter or drop any database table.'
        );
    }

    /**
     * The placeholder must not accept credentials, so it must not
     * render any credential input.
     */
    public function testSetupExposesNoCredentialInputs(): void
    {
        $body = (string) $this->get('setup')->getBody();

        // Guard against a vacuous pass on an empty body.
        $this->assertNotSame('', trim($body), 'Setup response body must not be empty.');
        $this->assertStringContainsString('School Installer', $body);

        $this->assertStringNotContainsStringIgnoringCase('type="password"', $body);
        $this->assertStringNotContainsStringIgnoringCase('name="db_host"', $body);
        $this->assertStringNotContainsStringIgnoringCase('name="db_password"', $body);
        $this->assertStringNotContainsStringIgnoringCase('name="db_username"', $body);
    }

    /**
     * The placeholder must be GET-only — a POST must not be routed,
     * because there is no installer to submit to yet.
     */
    public function testSetupRejectsPost(): void
    {
        $this->expectException(PageNotFoundException::class);

        $this->post('setup', ['db_host' => 'evil.example']);
    }
}
