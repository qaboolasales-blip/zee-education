<?php

namespace App\Models\SchoolLocal;

use CodeIgniter\Model;

class FeeReceiptModel extends Model
{
    protected $table = 'fee_receipts';

    protected $primaryKey = 'id';

    protected $allowedFields = ['invoice_id', 'receipt_number', 'amount_paid', 'payment_mode', 'reference', 'collector_id', 'paid_at', 'created_at'];

    protected $useTimestamps = false;
}