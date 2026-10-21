<?php

namespace AppSchool\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateAcademicStructure extends Migration
{
    public function up(): void
    {
        // Academic sessions (D-K-03)
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'start_date' => ['type' => 'DATE', 'null' => false],
            'end_date' => ['type' => 'DATE', 'null' => false],
            'is_active' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('academic_sessions', true);
        
        // Classes (D-K-04)
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'numeric_code' => ['type' => 'INT', 'null' => true],
            'is_active' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('classes', true);
        
        // Sections (D-K-04)
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'class_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'name' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'capacity' => ['type' => 'INT', 'null' => true],
            'is_active' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('class_id', 'classes', 'id', '', 'CASCADE');
        $this->forge->createTable('sections', true);
        
        // Subjects (D-K-04)
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'code' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'is_active' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('subjects', true);
        
        // Teacher assignments (D-K-05)
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'teacher_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'class_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'section_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'subject_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'academic_session_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'is_active' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('class_id', 'classes', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('section_id', 'sections', 'id', '', 'SET NULL');
        $this->forge->addForeignKey('subject_id', 'subjects', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('academic_session_id', 'academic_sessions', 'id', '', 'CASCADE');
        $this->forge->createTable('teacher_assignments', true);
    }

    public function down(): void
    {
        $this->forge->dropTable('teacher_assignments', true);
        $this->forge->dropTable('subjects', true);
        $this->forge->dropTable('sections', true);
        $this->forge->dropTable('classes', true);
        $this->forge->dropTable('academic_sessions', true);
    }
}
