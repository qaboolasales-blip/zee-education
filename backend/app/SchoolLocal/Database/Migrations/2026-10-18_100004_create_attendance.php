<?php

namespace AppSchool\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateAttendance extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'student_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'academic_session_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'class_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'section_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'attendance_date' => ['type' => 'DATE', 'null' => false],
            'status' => ['type' => 'ENUM', 'constraint' => ['present', 'absent', 'leave'], 'null' => false],
            'source' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'recorded_by' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'remarks' => ['type' => 'TEXT', 'null' => true],
            'corrected_by' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'correction_reason' => ['type' => 'TEXT', 'null' => true],
            'corrected_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['student_id', 'academic_session_id', 'attendance_date'], 'uq_attendance_student_date_session');
        $this->forge->addForeignKey('student_id', 'students', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('academic_session_id', 'academic_sessions', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('class_id', 'classes', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('section_id', 'sections', 'id', '', 'SET NULL');
        $this->forge->createTable('attendance', true);
    }

    public function down(): void
    {
        $this->forge->dropTable('attendance', true);
    }
}
