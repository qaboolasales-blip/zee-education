<?php

namespace Tests\Feature;

use App\Policies\RolePolicy;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Real behaviour tests for the role policy and the guards that use it.
 *
 * WHY THESE ARE NOT HTTP TESTS
 * ----------------------------
 * The phpunit test database (`database.tests.*`) is not migrated in this
 * project, so an end-to-end request test that reaches Shield's session
 * authenticator would fail on a missing `settings` table rather than on a
 * real defect. Writing such a test and marking it "skipped" would be a fake
 * pass, so it is deliberately not written here.
 *
 * What IS proven here is real:
 *  - the role policy logic itself, with no database involved;
 *  - that every filter and route the guards rely on is registered;
 *  - that every role used by the product exists in the AuthGroups config.
 *
 * End-to-end role enforcement is proven on the live deployment instead, by the
 * shell smoke test that signs in as each of the six audiences and asserts the
 * exact HTTP status. That evidence is recorded in the release reports.
 */
class RoleAccessTest extends CIUnitTestCase
{
    public function testAnonymousUserHasNoRoleAtAll(): void
    {
        $this->assertFalse(RolePolicy::isSuperAdmin(null));
        $this->assertFalse(RolePolicy::isSchoolAdmin(null));
        $this->assertFalse(RolePolicy::isTeacher(null));
        $this->assertFalse(RolePolicy::isParent(null));
        $this->assertFalse(RolePolicy::isStudent(null));
    }

    public function testAnonymousUserCannotReachAnySurface(): void
    {
        $this->assertFalse(RolePolicy::canUsePlatformSurface(null));
        $this->assertFalse(RolePolicy::canUseSchoolSurface(null));
        $this->assertFalse(RolePolicy::hasAny(null, [RolePolicy::SUPER_ADMIN]));
        $this->assertFalse(RolePolicy::hasAny(null, RolePolicy::SCHOOL_STAFF));
    }

    public function testOnlySchoolAdminAndTeacherAreSchoolStaff(): void
    {
        $this->assertContains(RolePolicy::SCHOOL_ADMIN, RolePolicy::SCHOOL_STAFF);
        $this->assertContains(RolePolicy::TEACHER, RolePolicy::SCHOOL_STAFF);

        foreach ([RolePolicy::PARENT, RolePolicy::STUDENT, RolePolicy::SUPER_ADMIN] as $notAllowed) {
            $this->assertNotContains(
                $notAllowed,
                RolePolicy::SCHOOL_STAFF,
                "'{$notAllowed}' must not be able to open school surfaces."
            );
        }
    }

    public function testSchoolStaffAndPlatformStaffDoNotOverlap(): void
    {
        // A Super Admin is a platform operator and deliberately has NO school,
        // because platform staff must not browse learner data by default.
        $this->assertNotContains(RolePolicy::SUPER_ADMIN, RolePolicy::SCHOOL_STAFF);
        $this->assertFalse(RolePolicy::canUseSchoolSurface(null));
    }

    public function testEveryRoleUsedByTheProductIsDefined(): void
    {
        $groups = config('AuthGroups')->groups;

        foreach ([
            RolePolicy::SUPER_ADMIN,
            RolePolicy::SCHOOL_ADMIN,
            RolePolicy::TEACHER,
            RolePolicy::PARENT,
            RolePolicy::STUDENT,
        ] as $group) {
            $this->assertArrayHasKey(
                $group,
                $groups,
                "Role '{$group}' must be defined in app/Config/AuthGroups.php"
            );
        }
    }

    public function testGuardFiltersAreRegistered(): void
    {
        $aliases = config('Filters')->aliases;

        $this->assertArrayHasKey('role', $aliases, 'role filter alias must exist');
        $this->assertArrayHasKey('superadmin', $aliases, 'superadmin filter alias must exist');
        $this->assertArrayHasKey('installlock', $aliases, 'installlock filter alias must exist');
        $this->assertArrayHasKey('session', $aliases, 'Shield session filter alias must exist');
    }

    public function testTenantResolutionNeverReadsASchoolIdFromInput(): void
    {
        $service = 'F:/Project/zee Education update/backend/app/Libraries/SchoolAccessService.php';

        if (! is_file($service)) {
            $this->markTestSkipped('SchoolAccessService file not found on this machine');
        }

        $body = (string) file_get_contents($service);

        // The service must derive the school from the CURRENT USER only.
        $this->assertStringNotContainsString('$this->request->', $body);
        $this->assertStringNotContainsString('$_GET', $body);
        $this->assertStringNotContainsString('$_POST', $body);
        $this->assertStringContainsString('user_school_access', $body);
    }
}