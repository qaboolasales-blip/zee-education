<?php
namespace AppSchool\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateFees extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'academic_session_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'student_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'fee_head' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'amount' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => false],
            'due_date' => ['type' => 'DATE', 'null' => false],
            'status' => ['type' => 'ENUM', 'constraint' => ['due','partial','paid','overdue'], 'default' => 'due'],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('academic_session_id', 'academic_sessions', 'id', '', 'CASCADE');
        $this->forge->createTable('fee_invoices', true);

        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'invoice_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'receipt_number' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'amount_paid' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => false],
            'payment_mode' => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => false],
            'reference' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'collector_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'paid_at' => ['type' => 'DATETIME', 'null' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('receipt_number');
        $this->forge->addForeignKey('invoice_id', 'fee_invoices', 'id', '', 'CASCADE');
        $this->forge->createTable('fee_receipts', true);
    }

    public function down(): void
    {
        $this->forge->dropTable('fee_receipts', true);
        $this->forge->dropTable('fee_invoices', true);
    }
}
