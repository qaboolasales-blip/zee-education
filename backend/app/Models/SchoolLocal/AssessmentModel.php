<?php
namespace App\Models\SchoolLocal;

use CodeIgniter\Model;

class AssessmentModel extends Model
{
    protected $table = 'assessments';
    protected $primaryKey = 'id';
    protected $allowedFields = ['academic_session_id','class_id','section_id','subject_id','teacher_id','exam_name','max_marks','weightage','status','created_at','updated_at'];
    protected $useTimestamps = true;
}

class MarksEntryModel extends Model
{
    protected $table = 'marks_entries';
    protected $primaryKey = 'id';
    protected $allowedFields = ['assessment_id','student_id','marks_obtained','is_absent','remarks','entry_status','reviewed_by','published_at','created_at','updated_at'];
    protected $useTimestamps = true;
}
