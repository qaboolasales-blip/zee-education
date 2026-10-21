<?php

namespace App\Controllers;

/**
 * School Mobile surface (PWA shell).
 *
 * SERVES THE APPROVED UI.
 *
 * The approved "Mobile App Preview" reference is permanently read-only and is
 * NEVER modified. This controller works on a separate runtime copy
 * (app/Views/portal/mobile.html) whose DEMO literals were replaced by tokens.
 * Those tokens are filled with real data read from the signed-in user's OWN
 * school database.
 *
 * Same tenant rules as the desktop school surface: the school is resolved
 * server-side from the session, never from a request (ADR-003).
 */
class MobileApp extends BaseController
{
    /** GET /m - the mobile app shell */
    public function index(): string
    {
        $data = $this->collect();

        $html = (string) file_get_contents(APPPATH . 'Views/portal/mobile.html');

        foreach ($data as $token => $value) {
            if (strpos($html, $token) === false) {
                continue;
            }

            $html = str_replace($token, $this->encode($value), $html);
        }

        return $html;
    }

    /**
     * @return array<string, mixed>
     */
    private function collect(): array
    {
        $access = new \App\Libraries\SchoolAccessService();

        $userId = auth()->loggedIn() ? (int) auth()->id() : null;
        $school = $access->schoolForUser($userId);

        $schoolName   = $school->name ?? 'Your School';
        $schoolCode   = (string) ($school->school_code ?? '');
        $profileName  = 'there';

        if (auth()->loggedIn()) {
            $profileName = ucwords(strtolower((string) (auth()->user()->username ?? '')));
        }

        $students  = [];
        $attendance = [];
        $leaderboard = [];

        $conn = $school === null ? null : $access->connectionForSchoolId((int) $school->id);

        if ($conn !== null) {
            try {
                if ($conn->tableExists('students')) {
                    foreach ($conn->table('students')->get()->getResultArray() as $s) {
                        $name = trim(($s['first_name'] ?? '') . ' ' . ($s['last_name'] ?? ''));

                        $students[]   = [$name, '-', ucfirst((string) ($s['status'] ?? 'active')), 'g'];
                        $attendance[] = [$name, (string) ($s['admission_number'] ?? '')];
                    }
                }
            } catch (\Throwable $e) {
                log_message('error', 'MobileApp::collect: ' . $e->getMessage());
            }
        }

        return [
            '__ZEE_M_SCHOOL__'          => $schoolName,
            '__ZEE_M_PROFILE__'         => $profileName,
            '__ZEE_M_DOMAIN__'          => $schoolCode . '.school',
            '__ZEE_M_CODE__'            => $schoolCode !== '' ? strtoupper($schoolCode) : '-',
            '__ZEE_M_STUDENTS__'        => $students,
            '__ZEE_M_ADMISSIONS__'      => [],
            '__ZEE_M_ATTENDANCE__'      => $attendance,
            '__ZEE_M_KP__'              => $leaderboard,
            '__ZEE_M_STUDENT_COUNT__'   => (string) count($students),
            '__ZEE_M_ADMISSION_COUNT__' => '0',
        ];
    }

    private function encode(mixed $value): string
    {
        return (string) json_encode(
            $value,
            JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
        );
    }
}