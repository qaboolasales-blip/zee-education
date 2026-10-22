<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Platform support tickets.
 *
 * The Super Admin "Support Tickets" tab reads this table. It did not exist
 * before, so the tab could never show a ticket and the "Create ticket" button
 * had nowhere to write to. Storage is on the CONTROL PLANE only: a ticket is
 * a platform-level record about an installation, never learner data.
 */
class CreateSupportTickets extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'          => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'ticket_no'   => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => false],
            'school_id'   => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'subject'     => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => false],
            'body'        => ['type' => 'TEXT', 'null' => true],
            'priority'    => ['type' => 'ENUM', 'constraint' => ['Low', 'Normal', 'High', 'Urgent'], 'default' => 'Normal'],
            'status'      => ['type' => 'ENUM', 'constraint' => ['new', 'in_review', 'waiting', 'resolved'], 'default' => 'new'],
            'created_by'  => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'assigned_to' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'resolved_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => false],
            'updated_at'  => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('ticket_no');
        $this->forge->addForeignKey('school_id', 'schools', 'id', '', 'SET NULL');
        $this->forge->createTable('support_tickets', true);
    }

    public function down(): void
    {
        $this->forge->dropTable('support_tickets', true);
    }
}
