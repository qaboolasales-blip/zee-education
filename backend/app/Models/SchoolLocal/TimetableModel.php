<?php
namespace App\Models\SchoolLocal;

use CodeIgniter\Model;

class TimetableModel extends Model
{
    protected $table = 'timetables';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'academic_session_id','class_id','section_id','subject_id','teacher_id',
        'day_of_week','start_time','end_time','location','created_at','updated_at',
    ];
    protected $useTimestamps = true;
}
