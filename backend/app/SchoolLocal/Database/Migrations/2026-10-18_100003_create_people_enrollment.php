<?php

namespace AppSchool\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreatePeopleEnrollment extends Migration
{
    public function up(): void
    {
        // Students (E-K-01)
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'first_name' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'last_name' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'admission_number' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false, 'unique' => true],
            'date_of_birth' => ['type' => 'DATE', 'null' => true],
            'gender' => ['type' => 'ENUM', 'constraint' => ['male', 'female', 'other'], 'null' => true],
            'status' => ['type' => 'ENUM', 'constraint' => ['active', 'inactive', 'transferred', 'withdrawn', 'archived'], 'default' => 'active'],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        // unique already declared on column
        $this->forge->createTable('students', true);
        
        // Guardians (E-K-02)
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'first_name' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'last_name' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'email' => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => true],
            'phone' => ['type' => 'VARCHAR', 'constraint' => 32, 'null' => true],
            'relation' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('guardians', true);
        
        // Student-Guardian links
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'student_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'guardian_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'is_primary' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('student_id', 'students', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('guardian_id', 'guardians', 'id', '', 'CASCADE');
        $this->forge->createTable('student_guardian', true);
        
        // Staff (E-K-03)
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'first_name' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'last_name' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'employee_id' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false, 'unique' => true],
            'role_type' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'user_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'status' => ['type' => 'ENUM', 'constraint' => ['active', 'inactive', 'terminated'], 'default' => 'active'],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        // unique already declared on column
        $this->forge->createTable('staff', true);
        
        // Enrollments (E-K-04)
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'student_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'class_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'section_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'academic_session_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'status' => ['type' => 'ENUM', 'constraint' => ['enrolled', 'promoted', 'transferred', 'withdrawn', 'archived'], 'default' => 'enrolled'],
            'enrollment_date' => ['type' => 'DATE', 'null' => false],
            'withdrawal_date' => ['type' => 'DATE', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('student_id', 'students', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('class_id', 'classes', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('section_id', 'sections', 'id', '', 'SET NULL');
        $this->forge->addForeignKey('academic_session_id', 'academic_sessions', 'id', '', 'CASCADE');
        $this->forge->createTable('enrollments', true);
    }

    public function down(): void
    {
        $this->forge->dropTable('enrollments', true);
        $this->forge->dropTable('staff', true);
        $this->forge->dropTable('student_guardian', true);
        $this->forge->dropTable('guardians', true);
        $this->forge->dropTable('students', true);
    }
}
