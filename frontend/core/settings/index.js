/**
 * Public surface of the Zee Education frontend school-settings layer (Batch D).
 *
 * Nothing here writes a setting, uploads a logo, builds a QR or renders a theme.
 * Importing this module has no side effects.
 */

export {
  THEME_TOKEN_NAMES,
  PROTECTED_TOKENS,
  DEFAULT_BRAND,
  THEME_SWATCHES,
  THEME_SWATCH_COUNT,
  isApprovedHex,
  themePairCount,
  resolveThemeSwatch,
  assertThemeTokensOnly,
  themeDeclarations,
  assertThemesMatchReferences,
} from './theme-tokens.js';

export {
  WRITABLE_SETTING_FIELDS,
  READONLY_SETTING_FIELDS,
  DEFAULT_SCHOOL_SETTINGS,
  APPROVED_SCHOOL_TIMEZONES,
  APPROVED_SCHOOL_CURRENCIES,
  SettingReject,
  validateSchoolTimezone,
  validateSchoolCurrency,
  validateSchoolLocale,
  validateSchoolName,
  validateSettingsPatch,
  applySchoolSettingDefaults,
  classifySchoolAvailability,
  isSchoolActive,
  settingText,
} from './school-settings.js';

export {
  HookKind,
  BINDINGS,
  bindingById,
  bindingsForScreen,
  publishableBindings,
  blockedBindings,
  assertNoElementCreation,
  assertBindingsMatchReference,
} from './element-bindings.js';

export {
  AcademicContractStatus,
  EXPECTED_SETTINGS_CONTRACT_DOC,
  SETTINGS_SCHEMA_PUBLISHED,
  ACADEMIC_SCHEMA_PUBLISHED,
  SETTINGS_ENDPOINTS_PUBLISHED,
  SETTINGS_INTEGRATION_AUTHORIZED,
  MISSING_ACADEMIC_ENTITIES,
  PENDING_SETTINGS_CONTRACTS,
  assertNoInventedAcademicSchemas,
  findPendingSettingsContract,
  describeSettingsBlock,
} from './contracts/pending-settings-contract.js';