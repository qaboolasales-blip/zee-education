<?php
namespace App\Models\SchoolLocal;

use CodeIgniter\Model;

class NoticeModel extends Model
{
    protected $table = 'notices';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'title','content','audience','class_id','section_id','published_by',
        'publish_date','expiry_date','is_published','created_at','updated_at',
    ];
    protected $useTimestamps = true;
}
