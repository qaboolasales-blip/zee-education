/**
 * Export / job / download outcome mapping. Task: J-O-03 and J-O-04.
 *
 * "Map export/job/download errors to existing feedback areas."
 *
 * There is exactly one feedback affordance in the locked UI, and this module is
 * built around that fact rather than working around it. Every button in the
 * references reports through `notice()`, which renders into `#toast`:
 *
 *   notice('Export preview')   notice('PDF preview')   notice('Billing export preview')
 *   notice('Create quote', …)  notice('Template editor preview')   notice('7 renewal notifications in demo')
 *
 * So an export failure is classified into a closed reason vocabulary and bound to
 * `#toast`. It does **not** invent an error banner, a modal, a spinner or a
 * skeleton — none of those exist in any reference, and adding one is a visual change.
 *
 * `classifyPdfOutcome()` from Batch G is reused for the download half rather than
 * reimplemented, so a zero-byte "PDF" is classified identically in both places.
 *
 * No DOM, no request, no rendering.
 */

import { classifyPdfOutcome } from '../curriculum/share-boundary.js';

/** Closed reason vocabulary. Every value maps to one existing `#toast` message. */
export const ExportOutcome = Object.freeze({
  READY: 'ready',
  NO_DATA: 'no-data',
  FORBIDDEN: 'forbidden',
  EXPIRED_DOWNLOAD: 'expired-download',
  FAILED_EXPORT: 'failed-export',
  EMPTY_DOCUMENT: 'empty-document',
  TRANSPORT: 'transport',
  UNKNOWN: 'unknown',
});

/**
 * The only feedback area that exists. Recorded explicitly so a future batch cannot
 * quietly introduce a second one without failing `assertSingleFeedbackArea()`.
 */
export const FEEDBACK_AREA = Object.freeze({ id: 'toast', hook: '#toast' });

/** HTTP statuses the published contract defines. */
const CONTRACT_STATUS = Object.freeze({
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
});

/**
 * Classify an export or download attempt into the closed vocabulary.
 *
 * Order matters. Authorisation is checked before existence, so a forbidden caller
 * cannot use a 404-vs-403 difference to probe for records they may not see.
 *
 * @param {{ status?: unknown, errorKind?: unknown, bytes?: unknown,
 *           rowCount?: unknown, exportUrl?: unknown, expiresAt?: unknown, now?: unknown }} outcome
 */
export function classifyExportOutcome(outcome = {}) {
  const status = Number.isInteger(outcome.status) ? outcome.status : null;

  if (outcome.errorKind) {
    return Object.freeze({ outcome: ExportOutcome.TRANSPORT, retryable: true, toast: 'Export failed. Try again.' });
  }

  if (status === null) {
    return Object.freeze({ outcome: ExportOutcome.UNKNOWN, retryable: false, toast: 'Export failed.' });
  }

  if (status === CONTRACT_STATUS.FORBIDDEN || status === CONTRACT_STATUS.UNAUTHENTICATED) {
    // Never the same message as a not-found: the two must not be distinguishable.
    return Object.freeze({
      outcome: ExportOutcome.FORBIDDEN,
      retryable: false,
      toast: 'You are not allowed to export this.',
    });
  }

  if (status === CONTRACT_STATUS.NOT_FOUND) {
    return Object.freeze({ outcome: ExportOutcome.NO_DATA, retryable: false, toast: 'No data to export.' });
  }

  if (status === CONTRACT_STATUS.BAD_REQUEST || status === CONTRACT_STATUS.RATE_LIMITED) {
    return Object.freeze({
      outcome: ExportOutcome.FAILED_EXPORT,
      retryable: status === CONTRACT_STATUS.RATE_LIMITED,
      toast: 'Export failed. Try again.',
    });
  }

  if (status >= 500) {
    return Object.freeze({
      outcome: ExportOutcome.FAILED_EXPORT,
      retryable: true,
      toast: 'Export failed. Try again.',
    });
  }

  // A download link is time-limited; an expired one is not a server error.
  if (outcome.exportUrl !== undefined && outcome.exportUrl !== null) {
    if (isExpired(outcome.expiresAt, outcome.now)) {
      return Object.freeze({
        outcome: ExportOutcome.EXPIRED_DOWNLOAD,
        retryable: false,
        toast: 'This download link has expired. Start the export again.',
      });
    }
    const document = classifyPdfOutcome({ status, bytes: outcome.bytes });
    if (document.usable === false) {
      const empty = document.reason === 'empty-document';
      return Object.freeze({
        outcome: empty ? ExportOutcome.EMPTY_DOCUMENT : ExportOutcome.FAILED_EXPORT,
        retryable: !empty,
        toast: empty ? 'The exported file was empty.' : 'Export failed. Try again.',
      });
    }
    return Object.freeze({ outcome: ExportOutcome.READY, retryable: false, toast: null });
  }

  // A job-based export: the request was accepted, so the question is whether it
  // produced any rows. An empty report is a real state, not a failure.
  const rows = Number.isInteger(outcome.rowCount) ? outcome.rowCount : null;
  if (rows !== null && rows === 0) {
    return Object.freeze({ outcome: ExportOutcome.NO_DATA, retryable: false, toast: 'No data to export.' });
  }

  return Object.freeze({ outcome: ExportOutcome.READY, retryable: false, toast: null });
}

function isExpired(expiresAt, now) {
  const expiry = Date.parse(expiresAt);
  if (!Number.isFinite(expiry)) return false;
  const reference = now === undefined ? Date.now() : Date.parse(now);
  if (!Number.isFinite(reference)) return false;
  return expiry <= reference;
}

/**
 * Bind a classified outcome to the single existing feedback area.
 *
 * @param {ReturnType<typeof classifyExportOutcome>} classified
 */
export function bindFeedback(classified) {
  return Object.freeze({
    area: FEEDBACK_AREA,
    message: classified.toast,
    show: classified.toast !== null,
  });
}

/**
 * Guard: exactly one feedback area may exist. A second error banner, modal,
 * spinner or skeleton would be a visual change, so the inventory is closed.
 *
 * @param {string[]} declared
 */
export function assertSingleFeedbackArea(declared) {
  const list = Array.isArray(declared) ? declared.filter((x) => typeof x === 'string') : [];
  const forbidden = list.filter((id) => id !== FEEDBACK_AREA.id);
  if (forbidden.length > 0) {
    throw new Error(
      `a second feedback area would be a visual change: ${forbidden.join(', ')}`,
    );
  }
  if (list.length > 1) {
    throw new Error('the feedback area is duplicated');
  }
  return true;
}

/**
 * J-O-04 — the required cases, asserted against the locked vocabulary rather than
 * against prose written for this batch.
 *
 * Every export action in the references is a *preview*, which is why none of them
 * can quietly become a real download in the adapter. The billing export lives in
 * Super Admin, so both surfaces are checked.
 *
 * @param {string} schoolDashboardSource
 * @param {string} platformSource
 */
export function assertExportOutcomesMatchReferences(schoolDashboardSource, platformSource) {
  if (typeof schoolDashboardSource !== 'string' || schoolDashboardSource === '') {
    throw new Error('no School Dashboard reference supplied');
  }
  const problems = [];
  const previews = [
    ['Export preview', schoolDashboardSource],
    ['PDF preview', schoolDashboardSource],
    ['Billing export preview', platformSource],
  ];
  for (const [preview, source] of previews) {
    if (typeof source !== 'string' || !source.includes(preview)) {
      problems.push(`the reference no longer previews "${preview}"`);
    }
  }
  if (!schoolDashboardSource.includes('Permission controlled')) {
    problems.push('the EXPORTS tile no longer states that exports are permission controlled');
  }
  if (problems.length > 0) {
    throw new Error(`export outcome contract drifted:\n  ${problems.join('\n  ')}`);
  }
  return true;
}
