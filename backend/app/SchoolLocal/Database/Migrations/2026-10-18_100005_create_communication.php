<?php

namespace AppSchool\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateCommunication extends Migration
{
    public function up(): void
    {
        // Timetable (G-K-01)
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'academic_session_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'class_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'section_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'subject_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'teacher_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'day_of_week' => ['type' => 'TINYINT', 'constraint' => 1, 'null' => false], // 1-7
            'start_time' => ['type' => 'TIME', 'null' => false],
            'end_time' => ['type' => 'TIME', 'null' => false],
            'location' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('academic_session_id', 'academic_sessions', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('class_id', 'classes', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('section_id', 'sections', 'id', '', 'SET NULL');
        $this->forge->addForeignKey('subject_id', 'subjects', 'id', '', 'CASCADE');
        $this->forge->createTable('timetables', true);
        
        // Homework (G-K-03)
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'academic_session_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'class_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'section_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'subject_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'teacher_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'title' => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => false],
            'description' => ['type' => 'TEXT', 'null' => true],
            'due_date' => ['type' => 'DATE', 'null' => false],
            'has_attachment' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'attachment_policy' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('academic_session_id', 'academic_sessions', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('class_id', 'classes', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('section_id', 'sections', 'id', '', 'SET NULL');
        $this->forge->addForeignKey('subject_id', 'subjects', 'id', '', 'CASCADE');
        $this->forge->createTable('homework', true);
        
        // Notices (G-K-04)
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'title' => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => false],
            'content' => ['type' => 'TEXT', 'null' => false],
            'audience' => ['type' => 'ENUM', 'constraint' => ['all', 'students', 'parents', 'teachers', 'staff'], 'default' => 'all'],
            'class_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'section_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'published_by' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'publish_date' => ['type' => 'DATETIME', 'null' => true],
            'expiry_date' => ['type' => 'DATETIME', 'null' => true],
            'is_published' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('class_id', 'classes', 'id', '', 'SET NULL');
        $this->forge->addForeignKey('section_id', 'sections', 'id', '', 'SET NULL');
        $this->forge->createTable('notices', true);
    }

    public function down(): void
    {
        $this->forge->dropTable('notices', true);
        $this->forge->dropTable('homework', true);
        $this->forge->dropTable('timetables', true);
    }
}
