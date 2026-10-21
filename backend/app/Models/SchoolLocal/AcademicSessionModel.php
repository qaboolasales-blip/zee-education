<?php

namespace App\Models\SchoolLocal;

use CodeIgniter\Model;

class AcademicSessionModel extends Model
{
    protected $table = 'academic_sessions';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $allowedFields = ['name', 'start_date', 'end_date', 'is_active'];
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
