<?php

namespace Config;

use App\Libraries\BillingService;
use App\Libraries\CredentialVault;
use App\Libraries\HostResolver;
use App\Libraries\InviteService;
use App\Libraries\LicenseService;
use App\Libraries\QrRenderer;
use App\Libraries\SchoolAccessService;
use App\Libraries\SchoolRecordService;
use CodeIgniter\Config\BaseService;

/**
 * Services Configuration file.
 *
 * Services are simply other classes/libraries that the system uses
 * to do its job. This is used by CodeIgniter to allow the core of
 * the framework to be swapped out easily without affecting the usage within
 * the rest of your application.
 *
 * The commercial services below are registered as SHARED instances so that a
 * single request reads a school's licence row once rather than once per
 * caller. LicenseFilter, the school API and the dashboard therefore all agree
 * on the licence state within one request.
 *
 * NOTE ON SIGNATURE: CodeIgniter calls these with a single bool
 * ($getShared). getSharedInstance() must therefore be called with the key only
 * - passing the class name as a second argument makes CodeIgniter append its own
 * false, and the method receives a string where it expects a bool.
 */
class Services extends BaseService
{
    /**
     * Tenant resolution: which school a signed-in user belongs to, and how to
     * reach that school's dedicated database.
     */
    public static function schoolAccess(bool $getShared = true)
    {
        return $getShared
            ? static::getSharedInstance('schoolAccess')
            : new SchoolAccessService();
    }

    /**
     * The commercial licence authority. Shared so every caller in one request
     * sees the same licence row rather than re-reading it.
     */
    public static function licenses(bool $getShared = true)
    {
        return $getShared
            ? static::getSharedInstance('licenses')
            : new LicenseService();
    }

    /**
     * Manual licence billing: quote, collect, settle, renew.
     */
    public static function billing(bool $getShared = true)
    {
        return $getShared
            ? static::getSharedInstance('billing')
            : new BillingService();
    }

    /**
     * Per-school MySQL credentials, encrypted at rest.
     */
    public static function credentialVault(bool $getShared = true)
    {
        return $getShared
            ? static::getSharedInstance('credentialVault')
            : new CredentialVault();
    }

    /**
     * Domain to school resolution for the platform's multi-domain install.
     */
    public static function hostResolver(bool $getShared = true)
    {
        return $getShared
            ? static::getSharedInstance('hostResolver')
            : new HostResolver();
    }

    /**
     * QR rendering for connect invites.
     */
    public static function qr(bool $getShared = true)
    {
        return $getShared
            ? static::getSharedInstance('qr')
            : new QrRenderer();
    }

/**
     * Short-lived QR / manual connect tokens.
     */
    public static function invites(bool $getShared = true)
    {
        return $getShared
            ? static::getSharedInstance('invites')
            : new InviteService();
    }

    /**
     * School-local reads and writes against a school's own database.
     */
    public static function schoolRecords(bool $getShared = true)
    {
        return $getShared
            ? static::getSharedInstance('schoolRecords')
            : new SchoolRecordService();
    }
}