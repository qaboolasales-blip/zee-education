<?php
namespace App\Models\SchoolLocal;

use CodeIgniter\Model;

class HomeworkModel extends Model
{
    protected $table = 'homework';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'academic_session_id','class_id','section_id','subject_id','teacher_id',
        'title','description','due_date','has_attachment','attachment_policy','created_at','updated_at',
    ];
    protected $useTimestamps = true;
}
