<?php
namespace AppSchool\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateAssessments extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'academic_session_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'class_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'section_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'subject_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'teacher_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'exam_name' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'max_marks' => ['type' => 'DECIMAL', 'constraint' => '6,2', 'null' => false],
            'weightage' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => true],
            'status' => ['type' => 'ENUM', 'constraint' => ['draft','submitted','reviewed','published'], 'default' => 'draft'],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('academic_session_id', 'academic_sessions', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('class_id', 'classes', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('section_id', 'sections', 'id', '', 'SET NULL');
        $this->forge->addForeignKey('subject_id', 'subjects', 'id', '', 'CASCADE');
        $this->forge->createTable('assessments', true);

        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'assessment_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'student_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'marks_obtained' => ['type' => 'DECIMAL', 'constraint' => '6,2', 'null' => true],
            'is_absent' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'remarks' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'entry_status' => ['type' => 'ENUM', 'constraint' => ['draft','submitted','reviewed','published'], 'default' => 'draft'],
            'reviewed_by' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'published_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['assessment_id', 'student_id']);
        $this->forge->addForeignKey('assessment_id', 'assessments', 'id', '', 'CASCADE');
        $this->forge->createTable('marks_entries', true);
    }

    public function down(): void
    {
        $this->forge->dropTable('marks_entries', true);
        $this->forge->dropTable('assessments', true);
    }
}
