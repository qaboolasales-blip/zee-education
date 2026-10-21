<?php

namespace App\Policies;

use CodeIgniter\Shield\Entities\User;

/**
 * Single source of truth for "which roles exist and what may they do".
 *
 * Previously this class existed but was referenced by nothing, so role checks
 * were duplicated (and drifted) across the filters. Both filters and the API
 * controller now resolve their answers from here.
 *
 * NOTE the group names: the canonical Super Admin group is 'superadmin'
 * (see app/Config/AuthGroups.php). 'super_admin' is still accepted so
 * installations created with the older naming keep working.
 */
class RolePolicy
{
    public const SUPER_ADMIN = 'superadmin';
    public const SCHOOL_ADMIN = 'school_admin';
    public const TEACHER      = 'teacher';
    public const PARENT       = 'parent';
    public const STUDENT      = 'student';

    /** @var list<string> */
    public const SCHOOL_STAFF = [self::SCHOOL_ADMIN, self::TEACHER];

    public static function isSuperAdmin(?User $user): bool
    {
        return $user !== null
            && ($user->inGroup(self::SUPER_ADMIN) || $user->inGroup('super_admin'));
    }

    public static function isSchoolAdmin(?User $user): bool
    {
        return $user !== null && $user->inGroup(self::SCHOOL_ADMIN);
    }

    public static function isTeacher(?User $user): bool
    {
        return $user !== null && $user->inGroup(self::TEACHER);
    }

    public static function isParent(?User $user): bool
    {
        return $user !== null && $user->inGroup(self::PARENT);
    }

    public static function isStudent(?User $user): bool
    {
        return $user !== null && $user->inGroup(self::STUDENT);
    }

    /**
     * May this user open the school surfaces of their OWN school?
     */
    public static function canUseSchoolSurface(?User $user): bool
    {
        if ($user === null) {
            return false;
        }

        foreach (self::SCHOOL_STAFF as $group) {
            if ($user->inGroup($group)) {
                return true;
            }
        }

        return false;
    }

    /**
     * May this user reach the Super Admin platform surface?
     */
    public static function canUsePlatformSurface(?User $user): bool
    {
        return self::isSuperAdmin($user);
    }

    /**
     * @param  list<string> $required
     */
    public static function hasAny(?User $user, array $required): bool
    {
        if ($user === null) {
            return false;
        }

        foreach ($required as $group) {
            if ($user->inGroup(trim($group))) {
                return true;
            }
        }

        return false;
    }
}