<?php

declare(strict_types=1);

/**
 * This file is part of CodeIgniter Shield.
 *
 * (c) CodeIgniter Foundation <admin@codeigniter.com>
 *
 * For the full copyright and license information, please view
 * the LICENSE file that was distributed with this source code.
 */

namespace Config;

use CodeIgniter\Shield\Config\Auth as ShieldAuth;
use CodeIgniter\Shield\Authentication\Actions\ActionInterface;
use CodeIgniter\Shield\Authentication\AuthenticatorInterface;
use CodeIgniter\Shield\Authentication\Authenticators\AccessTokens;
use CodeIgniter\Shield\Authentication\Authenticators\HmacSha256;
use CodeIgniter\Shield\Authentication\Authenticators\JWT;
use CodeIgniter\Shield\Authentication\Authenticators\Session;
use CodeIgniter\Shield\Authentication\Passwords\CompositionValidator;
use CodeIgniter\Shield\Authentication\Passwords\DictionaryValidator;
use CodeIgniter\Shield\Authentication\Passwords\NothingPersonalValidator;
use CodeIgniter\Shield\Authentication\Passwords\PwnedValidator;
use CodeIgniter\Shield\Authentication\Passwords\ValidatorInterface;
use CodeIgniter\Shield\Models\UserModel;

class Auth extends ShieldAuth
{
    /*
     * ///////////////////////////////////////////////////////////////////
     *
     * AUTHENTICATION
     *
     * ///////////////////////////////////////////////////////////////////
     */

    // Constants for Record Login Attempts. Do not change.
    public const RECORD_LOGIN_ATTEMPT_NONE    = 0; // Do not record at all
    public const RECORD_LOGIN_ATTEMPT_FAILURE = 1; // Record only failures
    public const RECORD_LOGIN_ATTEMPT_ALL     = 2; // Record all login attempts

    /** @var array<string, class-string<AuthenticatorInterface>> */
    public array $authenticators = [
        'tokens'  => AccessTokens::class,
        'session' => Session::class,
        'hmac'    => HmacSha256::class,
        // 'jwt'     => JWT::class,
    ];

    /** @var string */
    public string $defaultAuthenticator = 'session';

    /** @var list<string> */
    public array $authenticationChain = [
        'session',
        'tokens',
        'hmac',
        // 'jwt',
    ];

    /** @var array<string, class-string<ActionInterface>|null> */
    public array $actions = [
        'register' => null,
        'login'    => null,
    ];

    /** @var array<string, string> */
    public array $tables = [
        'users'             => 'users',
        'identities'        => 'auth_identities',
        'logins'            => 'auth_logins',
        'token_logins'      => 'auth_token_logins',
        'remember_tokens'   => 'auth_remember_tokens',
        'groups_users'      => 'auth_groups_users',
        'permissions_users' => 'auth_permissions_users',
    ];

    /** @var class-string<UserModel> */
    public string $userProvider = UserModel::class;

    // Groups
    // Super Admin
    // School Admin
    // Teacher
    // Parent/Guardian
    // Student

    /**
     * Returns the URL that a user should be redirected
     * to after a successful login.
     */
    public function loginRedirect(): string
    {
        $session = session();
        $url     = $session->getTempdata('beforeLoginUrl') ?? setting('Auth.redirects')['login'];

        return $this->getUrl($url);
    }

    /**
     * Returns the URL that a user should be redirected
     * to after they are logged out.
     */
    public function logoutRedirect(): string
    {
        $url = setting('Auth.redirects')['logout'];

        return $this->getUrl($url);
    }

    /**
     * Returns the URL the user should be redirected to
     * after a successful registration.
     */
    public function registerRedirect(): string
    {
        $url = setting('Auth.redirects')['register'];

        return $this->getUrl($url);
    }

    /**
     * Returns the URL the user should be redirected to
     * if force_reset identity is set to true.
     */
    public function forcePasswordResetRedirect(): string
    {
        $url = setting('Auth.redirects')['force_reset'];

        return $this->getUrl($url);
    }

    /**
     * Returns the URL the user should be redirected to
     * if permission denied.
     */
    public function permissionDeniedRedirect(): string
    {
        $url = setting('Auth.redirects')['permission_denied'];

        return $this->getUrl($url);
    }

    /**
     * Returns the URL the user should be redirected to
     * if group denied.
     */
    public function groupDeniedRedirect(): string
    {
        $url = setting('Auth.redirects')['group_denied'];

        return $this->getUrl($url);
    }

    /**
     * Accepts a string which can be an absolute URL or
     * a named route or just a URI path, and returns the
     * full path.
     *
     * @param string $url an absolute URL or a named route or just URI path
     */
    protected function getUrl(string $url): string
    {
        return match (true) {
            str_starts_with($url, 'http://') || str_starts_with($url, 'https://') => $url,
            route_to($url) !== false                                              => rtrim(url_to($url), '/ '),
            default                                                               => rtrim(site_url($url), '/ '),
        };
    }
}
