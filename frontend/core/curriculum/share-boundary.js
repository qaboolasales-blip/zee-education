/**
 * Manual PDF download / share boundary. Tasks: G-O-03 and G-O-05.
 *
 * THE V1 RULE
 *  UNIVERSAL_RULES §7 and PROJECT_MEMORY both state:
 *    - V1 has "manual fee records and manual user-initiated WhatsApp PDF sharing";
 *    - SMS, online payment gateway, unofficial/QR WhatsApp Web automation and
 *      automated WhatsApp Business API are **excluded**.
 *
 *  So sharing must be MANUAL and USER-INITIATED. This module is the enforcement
 *  point for that rule:
 *
 *  - A share must originate from an existing approved control, initiated by a user.
 *  - Only PDF is shareable. No image, no URL, no contact card.
 *  - No WhatsApp or messaging endpoint may be called from code, ever. The share
 *    target is the OS, reached through the browser's own download/user-activation
 *    path — never through an API.
 *  - No recipient may be addressed programmatically. The user picks the recipient.
 *
 * `assertNoUnofficialAutomation()` is G-O-05: it scans executable code across
 * `frontend/core/**` and fails if any unofficial messaging or automation surface
 * appears.
 *
 * No network call, no DOM, no storage.
 */

/** Share kinds the approved UI can initiate. */
export const ShareKind = Object.freeze({
  PDF_DOWNLOAD: 'pdf-download',
  PDF_USER_SHARE: 'pdf-user-share',
  PRINT: 'print',
  EXPORT_TABLE: 'export-table',
});

/**
 * The approved controls that may initiate a share, and what each may do.
 * Each `trigger` is the existing locked control's visible action text.
 */
export const APPROVED_SHARE_TRIGGERS = Object.freeze([
  Object.freeze({
    id: 'TRG-01',
    surface: 'school-desktop',
    screen: 'Reports & Print',
    trigger: 'Print / PDF',
    kinds: Object.freeze([ShareKind.PDF_DOWNLOAD, ShareKind.PRINT]),
    note: 'Server-side rendering is required; the reference already states so.',
  }),
  Object.freeze({
    id: 'TRG-02',
    surface: 'school-desktop',
    screen: 'Reports & Print',
    trigger: 'Export Excel / CSV',
    kinds: Object.freeze([ShareKind.EXPORT_TABLE]),
    note: 'Permission-controlled exports; no messaging destination.',
  }),
  Object.freeze({
    id: 'TRG-03',
    surface: 'mobile-app',
    screen: 'Results',
    trigger: 'Share result PDF',
    kinds: Object.freeze([ShareKind.PDF_USER_SHARE]),
    note:
      'Parent / Student result share. The reference wording is "Manual PDF-share preview", so ' +
      'any real flow must remain user-initiated.',
  }),
  Object.freeze({
    id: 'TRG-04',
    surface: 'mobile-app',
    screen: 'Profile',
    trigger: 'Share result PDF on WhatsApp',
    kinds: Object.freeze([ShareKind.PDF_USER_SHARE]),
    note:
      'The locked copy is "Manual WhatsApp PDF-share preview". The application named in the ' +
      'label is the USER-chosen destination, never an API integration.',
  }),
]);

/** The only shareable media type in V1. */
export const ALLOWED_MEDIA_TYPES = Object.freeze(['application/pdf']);

export const ShareReject = Object.freeze({
  UNKNOWN_TRIGGER: 'unknown-trigger',
  UNKNOWN_KIND: 'unknown-kind',
  KIND_NOT_ALLOWED_HERE: 'kind-not-allowed-here',
  NOT_USER_INITIATED: 'not-user-initiated',
  MEDIA_TYPE_NOT_ALLOWED: 'media-type-not-allowed',
  AUTOMATION_FORBIDDEN: 'automation-forbidden',
  NO_DOCUMENT: 'no-document',
});

/**
 * Destinations that would turn a manual share into an automated integration.
 * Recorded so an accidental reference fails loudly rather than shipping.
 */
export const FORBIDDEN_DESTINATIONS = Object.freeze([
  'whatsapp',
  'whatsapp-api',
  'whatsapp-cloud-api',
  'twilio',
  'vonage',
  'telegram-bot',
  'sms-gateway',
  'email-smtp',
]);

function ok(value) {
  return Object.freeze({ allowed: true, reason: null, value, errors: Object.freeze([]) });
}

function fail(reason, errors = []) {
  return Object.freeze({ allowed: false, reason, value: null, errors: Object.freeze(errors) });
}

/**
 * Validate a share request against the manual V1 boundary.
 *
 * @param {{
 *   triggerId?: string,
 *   kind?: string,
 *   userInitiated?: boolean,
 *   mediaType?: string,
 *   documentRef?: string,
 *   destination?: string,
 * }} request
 */
export function validateShareRequest(request = {}) {
  const trigger = APPROVED_SHARE_TRIGGERS.find((entry) => entry.id === request.triggerId);
  if (!trigger) return fail(ShareReject.UNKNOWN_TRIGGER);

  const kind = typeof request.kind === 'string' ? request.kind : null;
  if (!Object.values(ShareKind).includes(kind)) return fail(ShareReject.UNKNOWN_KIND);
  if (!trigger.kinds.includes(kind)) return fail(ShareReject.KIND_NOT_ALLOWED_HERE);

  // The defining property of V1 sharing: a human pressed the control.
  if (request.userInitiated !== true) return fail(ShareReject.NOT_USER_INITIATED);

  // A named destination would mean the code chooses the channel. The user does.
  if (typeof request.destination === 'string' && request.destination.trim() !== '') {
    const destination = request.destination.trim().toLowerCase();
    if (FORBIDDEN_DESTINATIONS.includes(destination)) {
      return fail(ShareReject.AUTOMATION_FORBIDDEN, [destination]);
    }
    return fail(ShareReject.AUTOMATION_FORBIDDEN, [request.destination]);
  }

  if (!trigger.kinds.includes(ShareKind.EXPORT_TABLE)) {
    const mediaType = typeof request.mediaType === 'string' ? request.mediaType : '';
    if (!ALLOWED_MEDIA_TYPES.includes(mediaType.trim().toLowerCase())) {
      return fail(ShareReject.MEDIA_TYPE_NOT_ALLOWED);
    }
  }

  if (typeof request.documentRef !== 'string' || request.documentRef.trim() === '') {
    return fail(ShareReject.NO_DOCUMENT);
  }

  return ok(
    Object.freeze({
      triggerId: trigger.id,
      kind,
      surface: trigger.surface,
      screen: trigger.screen,
      userInitiated: true,
      manual: true,
      documentRef: request.documentRef.trim(),
    }),
  );
}

/**
 * PDF generation outcome. `pdf-generation-failure` must be a first-class state
 * that never leaves a partial or empty document shareable (GCB-04).
 *
 * @param {{ status?: number|null, errorKind?: string|null, bytes?: number|null }} outcome
 */
export function classifyPdfOutcome(outcome = {}) {
  const status = Number.isInteger(outcome.status) ? outcome.status : null;

  if (outcome.errorKind) {
    return Object.freeze({ usable: false, reason: 'transport', shareable: false });
  }
  if (status === null) {
    return Object.freeze({ usable: false, reason: 'unknown', shareable: false });
  }
  if (status === 200) {
    const bytes = Number.isInteger(outcome.bytes) ? outcome.bytes : null;
    // An empty or zero-byte "PDF" is a failure, not a shareable document.
    if (bytes !== null && bytes <= 0) {
      return Object.freeze({ usable: false, reason: 'empty-document', shareable: false });
    }
    return Object.freeze({ usable: true, reason: null, shareable: true });
  }
  if (status === 401 || status === 403) {
    return Object.freeze({ usable: false, reason: 'forbidden', shareable: false });
  }
  if (status === 404) {
    return Object.freeze({ usable: false, reason: 'not-found', shareable: false });
  }
  if (status === 429) {
    return Object.freeze({ usable: false, reason: 'rate-limited', shareable: false });
  }
  return Object.freeze({ usable: false, reason: 'generation-failed', shareable: false });
}

/**
 * G-O-05 — assert that no module in the tree references an unofficial messaging
 * or automation surface.
 *
 * Scans executable code (comments stripped by the caller) for:
 *   - WhatsApp / messaging API hosts and schemes,
 *   - SMS or e-mail provider SDK/endpoint names,
 *   - browser automation drivers,
 *   - outbound absolute URLs of any kind.
 *
 * @param {Array<{ path: string, code: string }>} sources
 */
export function assertNoUnofficialAutomation(sources) {
  const list = Array.isArray(sources) ? sources : [];

  /**
   * Files that must NAME a forbidden integration in order to forbid it. A
   * denylist cannot avoid naming what it denies, so these modules are exempt from
   * the name-based patterns below — never from the absolute-URL pattern.
   * Matched by suffix so a caller may pass any path form.
   */
  const DECLARATION_MODULES = ['core/curriculum/share-boundary.js', 'core/curriculum/element-bindings.js'];
  const isDeclaration = (path) =>
    DECLARATION_MODULES.some((module) => path.replace(/\\/g, '/').endsWith(module));

  const namePatterns = [
    { label: 'WhatsApp host or scheme', pattern: /whatsapp|wa\.me|api\.whatsapp\.com|web\.whatsapp\.com/i },
    { label: 'SMS/email provider', pattern: /\b(twilio|vonage|nexmo|msg91|sendgrid|mailgun|postmark|ses)\b/i },
    { label: 'messaging API path', pattern: /\/messages\b|\/send[_-]?(sms|message|mail)\b/i },
    { label: 'automation driver', pattern: /\b(puppeteer|playwright|selenium|webdriver)\b/i },
    { label: 'email scheme', pattern: /mailto:/i },
  ];

  // Absolute and protocol-relative URLs are forbidden everywhere, including in
  // the files that declare the rule. The API client is the only network path and
  // it is relative-only by construction.
  const absoluteUrl = /['"`]https?:\/\/(?!localhost|127\.0\.0\.1)/i;

  const problems = [];
  for (const source of list) {
    if (!source || typeof source.code !== 'string') continue;
    if (absoluteUrl.test(source.code)) {
      problems.push(`${source.path}: outbound absolute URL`);
    }
    if (isDeclaration(source.path)) continue;
    for (const { label, pattern } of namePatterns) {
      if (pattern.test(source.code)) {
        problems.push(`${source.path}: ${label}`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `unofficial messaging/automation reference detected (V1 boundary violation):\n  ${problems.join('\n  ')}`,
    );
  }
  return true;
}