<?php

namespace App\Models;

use CodeIgniter\Model;

class AuditEventModel extends Model
{
    protected $table = 'platform_audit_events';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'actor_type',
        'actor_id',
        'action',
        'target_type',
        'target_id',
        'ip_address',
        'created_at',
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = '';
    protected $deletedField = '';

    // Append-only - no updates/deletes
}
