/**
 * Manual-payment boundary — the no-gateway guarantee. Task: I-O-05.
 *
 * "Confirm there is no payment gateway UI or checkout logic."
 *
 * This is a V1 exclusion, stated in UNIVERSAL_RULES §7 and already echoed by the
 * locked UI itself:
 *
 *   School Dashboard, Quick manual receipt:
 *     "Online gateway V1 mein nahin."   (online gateway is not in V1)
 *   Mobile Preview, fees feature:
 *     "Online payment V1 mein enabled nahin"
 *     "Manual source tracking"
 *
 * The reference collects a payment as: student, amount, **mode** (Cash/Bank),
 * and a receipt **reference**. There is no card field, no bank-account field, no
 * redirect, no token, no checkout. That is what makes the flow auditable.
 *
 * `assertNoPaymentGateway()` scans executable code across `frontend/core/**` and
 * fails on any gateway, checkout, tokenisation or card surface.
 *
 * `validateManualPayment()` is the positive half: a payment must state an approved
 * mode, must be manual, and must carry a reference for every mode except cash.
 *
 * No DOM, no network, no storage.
 */

/** Reasons a payment request is refused. */
export const PaymentReject = Object.freeze({
  NOT_MANUAL: 'not-manual',
  NOT_APPROVED_MODE: 'not-approved-mode',
  MODE_REQUIRES_REFERENCE: 'mode-requires-reference',
  NO_RECEIPT: 'no-receipt',
  CARD_DETECTED: 'card-detected',
  GATEWAY_DETECTED: 'gateway-detected',
  REDIRECT_DETECTED: 'redirect-detected',
  TOKEN_DETECTED: 'token-detected',
});

/** Payment-request fields that must never appear in a V1 payload. */
export const FORBIDDEN_PAYMENT_FIELDS = Object.freeze([
  'cardNumber',
  'card_number',
  'cvv',
  'cvc',
  'expiryMonth',
  'expiryYear',
  'expiry',
  'iban',
  'accountNumber',
  'account_number',
  'routingNumber',
  'sortCode',
  'pan',
  'gateway',
  'provider',
  'checkoutToken',
  'paymentToken',
  'redirectUrl',
  'returnUrl',
  'callbackUrl',
  'webhookSecret',
]);

function ok(value) {
  return Object.freeze({ allowed: true, reason: null, value, errors: Object.freeze([]) });
}

function fail(reason, errors = []) {
  return Object.freeze({ allowed: false, reason, value: null, errors: Object.freeze(errors) });
}

/**
 * Inspect a payment payload for any gateway, checkout, card or redirect surface.
 * Runs BEFORE anything else, because a forbidden field must be refused even if the
 * rest of the payload is valid.
 *
 * @param {Record<string, unknown>} payload
 */
export function inspectPaymentPayload(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return Object.freeze({ clean: true, findings: Object.freeze([]) });
  }
  const keys = Object.keys(payload);
  const forbidden = keys.filter((key) =>
    FORBIDDEN_PAYMENT_FIELDS.some((field) => field.toLowerCase() === key.toLowerCase()),
  );
  return Object.freeze({ clean: forbidden.length === 0, findings: Object.freeze(forbidden) });
}

/**
 * Validate that a payment is a manual V1 payment.
 *
 * @param {{ manual?: unknown, amount?: unknown, mode?: unknown, reference?: unknown, receiptRef?: unknown }} payment
 */
export function validateManualPaymentRequest(payment) {
  const inspection = inspectPaymentPayload(payment);
  if (!inspection.clean) {
    const lowered = inspection.findings.map((key) => key.toLowerCase());
    const reason = lowered.some((key) => /card|cvv|cvc|expiry|pan|iban|account|routing|sort/.test(key))
      ? PaymentReject.CARD_DETECTED
      : lowered.some((key) => /token/.test(key))
        ? PaymentReject.TOKEN_DETECTED
        : lowered.some((key) => /redirect|return|callback|webhook/.test(key))
          ? PaymentReject.REDIRECT_DETECTED
          : PaymentReject.GATEWAY_DETECTED;
    return fail(reason, [...inspection.findings]);
  }

  if (payment?.manual !== true) return fail(PaymentReject.NOT_MANUAL);
  return ok(Object.freeze({ manual: true, mode: payment?.mode ?? null }));
}

/**
 * I-O-05 — assert that no module in the tree carries a payment-gateway,
 * checkout, card or tokenisation surface.
 *
 * @param {Array<{ path: string, code: string }>} sources
 */
export function assertNoPaymentGateway(sources) {
  const list = Array.isArray(sources) ? sources : [];

  /**
   * Files that must NAME a gateway to forbid it. A denylist cannot avoid naming
   * what it denies, so these modules are exempt from the patterns below.
   *
   * The exemption does NOT weaken the guarantee: `assertNoNetworkCalls()` applies
   * to every file including these, and forbids any transport primitive or absolute
   * URL. So a forbidden gateway can be *named* here but can never be *called*.
   */
  const DECLARATION_MODULES = [
    'core/fees/payment-boundary.js',
    'core/fees/element-bindings.js',
  ];
  const isDeclaration = (path) =>
    DECLARATION_MODULES.some((module) => path.replace(/\\/g, '/').endsWith(module));

  const patterns = [
    {
      label: 'card data field',
      pattern: /\b(card_?number|cardnumber|cvv|cvc|card_?expiry|expiry_?month|primary_?account_?number)\b/i,
    },
    { label: 'bank account field', pattern: /\b(iban|routing_?number|sort_?code|account_?number)\b/i },
    { label: 'payment token field', pattern: /\b(checkout_?token|payment_?token|card_?token|stripe_?token)\b/i },
    {
      label: 'gateway host',
      pattern: /\b(stripe|paypal|razorpay|payfast|easypaisa|jcash|flutterwave|paystack|adyen|braintree)\b/i,
    },
    { label: 'checkout route', pattern: /\/checkout\/|\/payment-intent/i },
  ];

  const problems = [];
  for (const source of list) {
    if (!source || typeof source.code !== 'string') continue;
    if (isDeclaration(source.path)) continue;
    for (const { label, pattern } of patterns) {
      if (pattern.test(source.code)) {
        problems.push(`${source.path}: ${label}`);
      }
    }
    for (const forbidden of FORBIDDEN_PAYMENT_FIELDS) {
      if (source.code.includes(`'${forbidden}'`) || source.code.includes(`"${forbidden}"`)) {
        problems.push(`${source.path}: declares payment field ${forbidden}`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `payment gateway / checkout surface detected (V1 exclusion violated):\n  ${problems.join('\n  ')}`,
    );
  }
  return true;
}

/**
 * Strictest possible transport guard, applied to EVERY file with NO exemption.
 *
 * A denylist has to name what it denies, so a naive text scan always condemns the
 * module that defines the rule. Rather than exempting itself, this guard inspects
 * the code with comments, strings and regex literals removed — so it only sees
 * *executable* tokens. Naming `fetch` in a pattern list is invisible to it; calling
 * `fetch(...)` is not.
 *
 * @param {Array<{ path: string, code: string }>} sources
 */
export function assertNoNetworkCalls(sources) {
  const list = Array.isArray(sources) ? sources : [];
  const executablePatterns = [
    { label: 'fetch()', pattern: /\bfetch\s*\(/ },
    { label: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/ },
    { label: 'WebSocket', pattern: /\bWebSocket\b/ },
    { label: 'EventSource', pattern: /\bEventSource\b/ },
    { label: 'sendBeacon', pattern: /\bsendBeacon\b/ },
  ];
  /**
   * These two cannot be found in stripped code, because a module specifier and a
   * URL are both string literals. Neither declaration module contains one, so they
   * are checked against raw text with no exemption.
   */
  const rawPatterns = [
    { label: 'http(s) module import', pattern: /from\s+['"](node:)?https?['"]|require\(\s*['"](node:)?https?['"]\s*\)/ },
    { label: 'outbound absolute URL', pattern: /['"`]https?:\/\/(?!localhost|127\.0\.0\.1)/i },
  ];

  const problems = [];
  for (const source of list) {
    if (!source || typeof source.code !== 'string') continue;
    const executable = stripCommentsAndLiterals(source.code);
    for (const { label, pattern } of executablePatterns) {
      if (pattern.test(executable)) problems.push(`${source.path}: ${label}`);
    }
    for (const { label, pattern } of rawPatterns) {
      if (pattern.test(source.code)) problems.push(`${source.path}: ${label}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`unexpected network surface:\n  ${problems.join('\n  ')}`);
  }
  return true;
}

/** Characters after which a `/` starts a regex literal rather than a division. */
const REGEX_ALLOWED_AFTER = new Set([
  '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', '\n',
]);

/**
 * The single tokenizer behind both literal views. Returns the executable text
 * (comments, string literals and regex literals removed) and, when `collectStrings`
 * is set, the string literal contents.
 *
 * Both views share one scanner so they can never disagree about what a string is —
 * which matters because a guard has to be able to *name* a forbidden URL without
 * being caught by its own pattern.
 *
 * @param {string} code
 * @param {{ collectStrings?: boolean }} [options]
 * @returns {{ executable: string, strings: string[] }}
 */
function scanCode(code, options = {}) {
  const collectStrings = options.collectStrings === true;
  const source = String(code);
  const length = source.length;
  let out = '';
  const strings = [];
  let index = 0;

  while (index < length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '/' && next === '/') {
      while (index < length && source[index] !== '\n') index++;
      continue;
    }
    if (char === '/' && next === '*') {
      index += 2;
      while (index < length && !(source[index] === '*' && source[index + 1] === '/')) index++;
      index += 2;
      out += ' ';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      index++;
      let value = '';
      while (index < length) {
        if (source[index] === '\\') {
          value += source[index] + (source[index + 1] ?? '');
          index += 2;
          continue;
        }
        if (source[index] === quote) {
          index++;
          break;
        }
        value += source[index];
        index++;
      }
      if (collectStrings) strings.push(value);
      out += ' ';
      continue;
    }

    let previous = out.length - 1;
    while (previous >= 0 && /\s/.test(out[previous])) previous--;
    const previousChar = previous >= 0 ? out[previous] : '';

    if (char === '/' && REGEX_ALLOWED_AFTER.has(previousChar)) {
      index++;
      let inCharacterClass = false;
      while (index < length) {
        const current = source[index];
        if (current === '\\') {
          index += 2;
          continue;
        }
        if (current === '[') inCharacterClass = true;
        else if (current === ']') inCharacterClass = false;
        else if (current === '/' && !inCharacterClass) {
          index++;
          break;
        } else if (current === '\n') break;
        index++;
      }
      while (index < length && /[a-z]/.test(source[index])) index++;
      out += ' ';
      continue;
    }

    out += char;
    index++;
  }
  return { executable: out, strings };
}

/**
 * Remove comments, string literals and regex literals, keeping only executable
 * tokens. Used so a guard can name a forbidden identifier without matching itself.
 *
 * @param {string} code
 */
export function stripCommentsAndLiterals(code) {
  return scanCode(code).executable;
}

/**
 * The contents of every string literal, with comments and regex literals ignored.
 * This is the view a scan needs when it must catch a value that lives inside a
 * string — a development URL, for instance — without a guard matching its own
 * pattern list.
 *
 * @param {string} code
 * @returns {ReadonlyArray<string>}
 */
export function collectStringLiterals(code) {
  return Object.freeze(scanCode(code, { collectStrings: true }).strings);
}

/**
 * Guard that the locked references still state the V1 exclusion. If a future
 * revision removes that copy, the guarantee it documents has been reconsidered
 * and this module must be revisited rather than assumed.
 *
 * @param {Record<string, string>} referenceSources
 */
export function assertNoGatewayCopyInReferences(referenceSources) {
  const desktop = referenceSources?.['school-desktop'];
  const mobile = referenceSources?.['mobile-app'];
  const problems = [];

  if (typeof desktop !== 'string' || !desktop.includes('Online gateway V1 mein nahin')) {
    problems.push('the School Dashboard no longer states that online payment is out of V1');
  }
  if (typeof mobile !== 'string' || !mobile.includes('Online payment V1 mein enabled nahin')) {
    problems.push('the Mobile Preview no longer states that online payment is disabled');
  }
  if (problems.length > 0) {
    throw new Error(`V1 payment exclusion copy changed:\n  ${problems.join('\n  ')}`);
  }
  return true;
}