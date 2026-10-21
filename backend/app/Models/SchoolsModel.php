<?php

namespace App\Models;

use CodeIgniter\Model;

class SchoolsModel extends Model
{
    protected $table = 'schools';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'name',
        'status',
        'plan_code',
        'timezone',
        'currency',
        'locale',
        'contact_email',
        'contact_phone',
        'address',
        'branding_logo_path',
        'branding_reference',
        'commercial_metadata',
        'installation_state',
        'installation_status',
        'provisioned_at',
        'school_code',
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $deletedField = '';
}
