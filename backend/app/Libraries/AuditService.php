<?php

namespace App\Libraries;

use App\Models\AuditEventModel;
use CodeIgniter\HTTP\IncomingRequest;

class AuditService
{
    protected AuditEventModel $auditModel;

    public function __construct()
    {
        $this->auditModel = new AuditEventModel();
    }

    public function log(
        string $action,
        string $actorType = 'system',
        ?int $actorId = null,
        string $targetType = 'auth',
        ?int $targetId = null,
        ?string $ipAddress = null
    ): bool {
        $data = [
            'actor_type' => $actorType,
            'actor_id' => $actorId,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'ip_address' => $ipAddress ?? $this->getIpAddress(),
            'created_at' => date('Y-m-d H:i:s'),
        ];

        return $this->auditModel->insert($data) !== false;
    }

    public function logLoginSuccess(?int $userId = null, ?string $ip = null): bool
    {
        return $this->log(
            'login_success',
            'system',
            $userId,
            'auth',
            $userId,
            $ip
        );
    }

    public function logLoginFailure(?string $identifier = null, ?string $ip = null): bool
    {
        // Never log credentials/secrets - just the event
        return $this->log(
            'login_failure',
            'system',
            null,
            'auth',
            null,
            $ip
        );
    }

    public function logLogout(?int $userId = null, ?string $ip = null): bool
    {
        return $this->log(
            'logout',
            'system',
            $userId,
            'auth',
            $userId,
            $ip
        );
    }

    protected function getIpAddress(): ?string
    {
        $request = service('request');
        if ($request instanceof IncomingRequest) {
            return $request->getIPAddress();
        }
        return null;
    }
}
