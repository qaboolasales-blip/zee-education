<?php

namespace App\Controllers;

use App\Libraries\SchoolProvisioningService;
use App\Models\SchoolsModel;

/**
 * Super Admin platform API.
 *
 * This is the endpoint documented as POST /admin/schools/provision, which
 * previously existed in the documentation but had no route or implementation.
 *
 * SECURITY CONTRACT:
 *  - Super Admin only (platform operator, not a school user).
 *  - No database credentials are ever accepted from the request. The school
 *    database mapping comes from server-local configuration only (ADR-108).
 *  - The school code is validated against a strict allow-list and is used only
 *    to look up a mapping; it is never concatenated into SQL.
 */
class AdminApi extends BaseController
{
    /** GET /api/admin/schools */
    public function schools()
    {
        try {
            $model = new SchoolsModel();

            return $this->json([
                'ok'      => true,
                'schools' => $model->findAll(),
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'AdminApi::schools: ' . $e->getMessage());

            return $this->json(['ok' => false, 'message' => 'Could not read schools'], 500);
        }
    }

    /**
     * POST /admin/schools  create a school record
     * POST /admin/schools/provision  create AND provision it
     */
    public function provision()
    {
        $in   = $this->body();
        $name = trim((string) ($in['name'] ?? ''));
        $code = strtolower(trim((string) ($in['school_code'] ?? '')));

        if ($name === '') {
            return $this->json(['ok' => false, 'message' => 'School name is required'], 422);
        }

        if (preg_match('/^[a-z0-9]{3,20}$/', $code) !== 1) {
            return $this->json([
                'ok'      => false,
                'message' => 'School code must be 3-20 lowercase letters or digits',
            ], 422);
        }

        try {
            $model = new SchoolsModel();

            $existing = $model->where('school_code', $code)->first();

            if ($existing !== null) {
                return $this->json([
                    'ok'      => false,
                    'message' => 'That school code is already in use',
                    'id'      => (int) $existing->id,
                ], 409);
            }

            $id = $model->insert([
                'name'               => $name,
                'status'             => 'active',
                'school_code'        => $code,
                'plan_code'          => trim((string) ($in['plan_code'] ?? '')) ?: null,
                'timezone'           => trim((string) ($in['timezone'] ?? 'Asia/Karachi')),
                'currency'           => trim((string) ($in['currency'] ?? 'PKR')),
                'contact_email'      => trim((string) ($in['contact_email'] ?? '')) ?: null,
                'contact_phone'      => trim((string) ($in['contact_phone'] ?? '')) ?: null,
                'address'            => trim((string) ($in['address'] ?? '')) ?: null,
                'installation_state' => SchoolProvisioningService::STATE_REQUESTED,
                'installation_status' => SchoolProvisioningService::STATE_REQUESTED,
            ]);

            $service = new SchoolProvisioningService();
            $result  = $service->provisionSchool((int) $id, []);

            return $this->json([
                'ok'      => $result['success'] === true,
                'school'  => ['id' => (int) $id, 'name' => $name, 'school_code' => $code],
                'state'   => $model->find($id)->installation_state,
                'message' => $result['success'] === true
                    ? 'School created and provisioned'
                    : ($result['error'] ?? 'Provisioning could not finish'),
                'database' => $result['database'] ?? null,
            ], $result['success'] === true ? 201 : 200);
        } catch (\Throwable $e) {
            log_message('error', 'AdminApi::provision: ' . $e->getMessage());

            return $this->json(['ok' => false, 'message' => 'Provisioning failed; see the server log'], 500);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function body(): array
    {
        $raw = $this->request->getBody();

        if ($raw === '' || $raw === null) {
            return [];
        }

        $data = json_decode((string) $raw, true);

        return is_array($data) ? $data : [];
    }

    private function json(array $payload, int $status = 200)
    {
        return $this->response
            ->setStatusCode($status)
            ->setJSON($payload);
    }
}