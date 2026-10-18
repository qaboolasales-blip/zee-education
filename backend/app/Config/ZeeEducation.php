<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

/**
 * Zee Education platform identity.
 *
 * Holds the values the `/health` endpoint is allowed to disclose.
 *
 * IMPORTANT (M1.2 acceptance rule): `/health` must not expose database
 * credentials or detailed server information. Anything returned by
 * `/health` must come from this class so the disclosure surface stays
 * small, reviewable and auditable.
 */
class ZeeEducation extends BaseConfig
{
    /**
     * Product name.
     *
     * NOTE: the brand name "Zee Education" is PROVISIONAL. Trademark,
     * domain and legal clearance have NOT been completed.
     */
    public string $productName = 'Zee Education';

    /**
     * Which plane this application is.
     *
     * This application is the SUPER ADMIN CONTROL PLANE. It holds
     * school/installation metadata, commercial records, support and
     * provisioning state.
     *
     * It must NEVER hold student, guardian, staff, attendance, results
     * or fee data — every school owns a separate database (ADR-001).
     */
    public string $plane = 'control-plane';

    /**
     * Application version. Bump on every released change.
     */
    public string $appVersion = '0.1.0';

    /**
     * Minimum milestone label this build corresponds to.
     */
    public string $milestone = 'M1.2';

    /**
     * Display currency. Monetary values are stored as integer minor
     * units, never as floats.
     */
    public string $currency = 'PKR';

    /**
     * Default timezone for the platform. Individual schools may
     * override this in their own database once approved.
     */
    public string $timezone = 'Asia/Karachi';

    /**
     * Languages planned for V1. Full localization is NOT complete until
     * strings and layouts are actually translated and tested.
     */
    public array $supportedLanguages = ['en', 'ur'];

    /**
     * School base theme families. The selected base theme anchors brand,
     * active navigation and primary actions. Coordinated multicolor is
     * reserved for charts, categories and semantic statuses.
     *
     * @var list<string>
     */
    public array $baseThemes = [
        'Brown',
        'Red',
        'Orange',
        'Yellow',
        'Green',
        'Blue',
        'Navy Blue',
        'Purple',
    ];
}
