// Type definitions for @crowdhub/cordova-plugin-age-verification
// Project: https://github.com/CrowdhubApps/cordova-plugin-age-verification

/**
 * Normalized, cross-platform status of an age-assurance request.
 *
 * `sharing` / `declined` originate from Apple's Declared Age Range API; the
 * remaining values originate from the Google Play Age Signals API. `notAvailable`
 * is emitted by either platform when no age data can be provided.
 */
export type AgeAssuranceStatus =
    | 'sharing'
    | 'declined'
    | 'verified'
    | 'supervised'
    | 'supervisedApprovalPending'
    | 'supervisedApprovalDenied'
    | 'declared'
    | 'unknown'
    | 'notAvailable';

/** How the user's age range was established. */
export type AgeDeclaration = 'selfDeclared' | 'guardianDeclared' | 'confirmed';

/** Raw payload returned by the Google Play Age Signals API. */
export interface AndroidAgeSignals {
    /**
     * Raw verification-status name, e.g. `VERIFIED`, `SUPERVISED`, `DECLARED`,
     * `UNKNOWN`. `null` when the user is not in an applicable region or is not
     * sharing age data.
     */
    verificationStatus: string | null;
    /** Raw integer verification-status code from `AgeSignalsVerificationStatus`. */
    verificationStatusCode: number | null;
    /** Inclusive lower bound of a supervised user's age range, if available. */
    ageLower: number | null;
    /** Inclusive upper bound of a supervised user's age range, if available. */
    ageUpper: number | null;
    /** Stable install identifier used for revoked-approval handling. */
    installId: string | null;
    /** ISO-8601 timestamp of the most recent approved significant change. */
    mostRecentApprovalDate: string | null;
}

/** Raw payload returned by the Apple Declared Age Range API. */
export interface IosAgeRange {
    /** `sharing` or `declined`. */
    response: 'sharing' | 'declined';
    lowerBound: number | null;
    upperBound: number | null;
    declaration: AgeDeclaration | null;
    /** Raw value of the active-parental-controls OptionSet, as a string. */
    activeParentalControls: string;
}

/** Unified result returned by {@link AgeVerificationPlugin.requestAgeRange}. */
export interface AgeRangeResult {
    platform: 'android' | 'ios';
    /** True when usable age-range data was provided. */
    available: boolean;
    /** Normalized cross-platform status. */
    status: AgeAssuranceStatus;
    /** Inclusive lower bound of the user's age range, or `null` if unknown/open-ended. */
    lowerBound: number | null;
    /** Inclusive upper bound of the user's age range, or `null` if unknown/open-ended. */
    upperBound: number | null;
    /** How the age range was established, when known. */
    declaration: AgeDeclaration | null;
    /** Platform-specific raw payload for advanced consumers. */
    raw: AndroidAgeSignals | IosAgeRange;
}

export interface RequestAgeRangeOptions {
    /**
     * Age thresholds the app cares about. Used directly by iOS (up to three
     * values, e.g. `[13, 16, 18]`). Ignored on Android, which returns its own
     * Play Console-configured age bands.
     * @default [18]
     */
    ageGates?: number | number[];
}

export interface SupportResult {
    supported: boolean;
    platform: string;
    /** Present when `supported` is false. */
    reason?: string;
}

export interface AgeVerificationPlugin {
    /** Normalized status constants (mirrors {@link AgeAssuranceStatus}). */
    Status: { readonly [K: string]: AgeAssuranceStatus };
    /** Declaration constants (mirrors {@link AgeDeclaration}). */
    Declaration: { readonly [K: string]: AgeDeclaration };

    /** Request the user's age range / age signals. */
    requestAgeRange(options?: RequestAgeRangeOptions): Promise<AgeRangeResult>;

    /** Report whether age assurance is available on this device/OS. */
    isSupported(): Promise<SupportResult>;
}

declare global {
    interface CordovaPlugins {
        ageVerification: AgeVerificationPlugin;
    }
}

declare const ageVerification: AgeVerificationPlugin;
export default ageVerification;
