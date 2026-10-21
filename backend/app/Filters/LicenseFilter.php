<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Enforces the licence before a school is allowed to WRITE.
 *
 * WHAT IT DOES
 * ------------
 * For any write request (POST/PUT/PATCH/DELETE) reaching a school surface, it
 * asks LicenseService whether that school's licence currently permits writing.
 * If it does not, the request is refused with 402 Payment Required and a clear
 * message - the school sees why and what to do about it.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * It never deletes data. It never hides a school. It never touches reads.
 * An expired school can still sign in, still see its students, fees, results
 * and attendance, and can still export. What it loses is the ability to enter
 * NEW data until the licence is renewed. That is the commercial rule the owner
 * chose, and it is enforced here in exactly one place.
 *
 * WHO IS NOT AFFECTED
 * -------------------
 * Platform Super Admins are operators, not tenants. They have no school and so
 * have no school licence; this filter must never lock the person who collects
 * the fees. It returns early for them.
 *
 * It is registered as `license` in Config/Filters.php.
 */
class LicenseFilter implements FilterInterface
{
    /**
     * @param array|null $arguments passed from the route; unused today but kept
     *                               so the filter can be scoped later.
     */
    public function before(RequestInterface $request, $arguments = null)
    {
        if (! $this->isWriteRequest($request)) {
            return null;
        }

        // Never let a licence check stand between the operator and the console.
        if ($this->isSuperAdmin()) {
            return null;
        }

        $userId = auth()->id();

        if ($userId === null) {
            // No session: authentication filters handle this. Do not double up
            // with a licence error, which would leak that the school is licensed.
            return null;
        }

        $schoolId = service('schoolAccess')->schoolIdForUser((int) $userId);

        if ($schoolId === null) {
            return null;
        }

        $licenses = service('licenses');
        $state    = $licenses->state((int) $schoolId);

        if ($state['can_write']) {
            if ($state['license'] !== null) {
                $licenses->touchVerified((int) $state['license']->id);
            }

            return null;
        }

        return service('response')
            ->setStatusCode(402)
            ->setJSON([
                'error'     => 'license_' . $state['state'],
                'message'   => $state['message'],
                'state'     => $state['state'],
                'can_write' => false,
                'renew'     => 'Contact Zee Education to renew your annual licence.',
            ]);
    }

    /**
     * Nothing to do after the controller runs.
     */
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }

    private function isWriteRequest(RequestInterface $request): bool
    {
        return in_array(strtoupper((string) $request->getMethod()), ['POST', 'PUT', 'PATCH', 'DELETE'], true);
    }

    private function isSuperAdmin(): bool
    {
        // RolePolicy is the single source of truth for roles. It reads the
        // user's groups through Shield's User entity.
        //
        // NOTE: do NOT use auth()->getUserGroups() here. Shield has no such
        // method; Auth::__call() swallows the unknown call and returns null,
        // which would silently make every user look like a non-Super-Admin.
        return \App\Policies\RolePolicy::isSuperAdmin(auth()->user());
    }
}