/*
 * @crowdhub/cordova-plugin-age-verification
 *
 * Unified, Promise-based JavaScript interface over:
 *   - Android: Google Play Age Signals API
 *   - iOS:     Apple Declared Age Range API
 *
 * The native layers normalize their platform-specific responses into a single
 * AgeRangeResult shape (see types/index.d.ts).
 */
var exec = require('cordova/exec');

var SERVICE = 'AgeVerification';

/**
 * Normalized, cross-platform status values.
 * @readonly
 * @enum {string}
 */
var Status = {
    /** iOS: the user shared an age range. */
    SHARING: 'sharing',
    /** iOS: the user declined to share an age range. */
    DECLINED: 'declined',
    /** Android: age verified (e.g. gov ID / credit card / facial estimation). */
    VERIFIED: 'verified',
    /** Android: supervised Google Account (age set by a guardian). */
    SUPERVISED: 'supervised',
    /** Android: a guardian has not yet approved a pending significant change. */
    SUPERVISED_APPROVAL_PENDING: 'supervisedApprovalPending',
    /** Android: a guardian denied approval. */
    SUPERVISED_APPROVAL_DENIED: 'supervisedApprovalDenied',
    /** Android: the user declared their own age. */
    DECLARED: 'declared',
    /** Android: user is not verified/supervised in an applicable region. */
    UNKNOWN: 'unknown',
    /** Either platform: no age data is available (region/account/OS version). */
    NOT_AVAILABLE: 'notAvailable'
};

/**
 * How the age range was established.
 * @readonly
 * @enum {string}
 */
var Declaration = {
    SELF_DECLARED: 'selfDeclared',
    GUARDIAN_DECLARED: 'guardianDeclared',
    /** Established via a scrutinized method (payment / government ID). */
    CONFIRMED: 'confirmed'
};

function normalizeGates(ageGates) {
    if (ageGates == null) {
        return [18];
    }
    if (typeof ageGates === 'number') {
        ageGates = [ageGates];
    }
    if (!Array.isArray(ageGates) || ageGates.length === 0) {
        throw new TypeError('ageGates must be a number or a non-empty array of numbers');
    }
    var gates = ageGates
        .map(function (g) { return Math.trunc(g); })
        .filter(function (g) { return Number.isFinite(g) && g > 0; });
    if (gates.length === 0) {
        throw new TypeError('ageGates must contain at least one positive integer');
    }
    // Apple accepts at most three thresholds; Android ignores them entirely.
    return gates.slice(0, 3);
}

/**
 * Request the user's age range / age signals.
 *
 * @param {Object} [options]
 * @param {number|number[]} [options.ageGates=[18]] Age thresholds the app cares
 *        about. Used directly by iOS (up to three values). Ignored on Android,
 *        which returns its own configured age bands.
 * @returns {Promise<AgeRangeResult>}
 */
function requestAgeRange(options) {
    options = options || {};
    var gates;
    try {
        gates = normalizeGates(options.ageGates);
    } catch (e) {
        return Promise.reject(e);
    }
    return new Promise(function (resolve, reject) {
        exec(resolve, reject, SERVICE, 'requestAgeRange', [{ ageGates: gates }]);
    });
}

/**
 * Report whether age assurance is available on this device/OS.
 *
 * @returns {Promise<{supported: boolean, platform: string, reason?: string}>}
 */
function isSupported() {
    return new Promise(function (resolve, reject) {
        exec(resolve, reject, SERVICE, 'isSupported', []);
    });
}

module.exports = {
    Status: Status,
    Declaration: Declaration,
    requestAgeRange: requestAgeRange,
    isSupported: isSupported
};
