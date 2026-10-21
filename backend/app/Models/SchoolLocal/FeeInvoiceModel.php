<?php

namespace App\Models\SchoolLocal;

use CodeIgniter\Model;

class FeeInvoiceModel extends Model
{
    protected $table = 'fee_invoices';

    protected $primaryKey = 'id';

    protected $allowedFields = ['academic_session_id', 'student_id', 'fee_head', 'amount', 'due_date', 'status', 'created_at', 'updated_at'];

    protected $useTimestamps = true;
}