# @crowdhub/cordova-plugin-age-verification

Privacy-preserving **age assurance** for Cordova apps. One Promise-based
JavaScript API (with TypeScript definitions) over the two native platform APIs:

| Platform | Native API | Language |
| --- | --- | --- |
| Android | [Google Play Age Signals API](https://developer.android.com/google/play/age-signals/overview) | Kotlin |
| iOS | [Apple Declared Age Range API](https://developer.apple.com/documentation/declaredagerange/) | Swift |

Both native layers normalize their platform-specific responses into a single
[`AgeRangeResult`](types/index.d.ts) shape so your app can treat them uniformly.

## Installation

```sh
cordova plugin add @crowdhub/cordova-plugin-age-verification
```

The package is published to the CrowdHub npm scope (`@crowdhub`).

## Requirements

### Android
- `minSdkVersion` **23** or higher (set it in your app's `config.xml`).
- AndroidX and Kotlin are enabled automatically by the plugin.
- The Age Signals API only returns data on installs **updated by Google Play**,
  and only for users in regions where age data is legally required. Enroll your
  app in the **Play Console** and configure your age bands there.
- Pairing with the [Play Integrity API](https://developer.android.com/google/play/integrity)
  is recommended to ensure calls come from a genuine app.

### iOS
- **iOS 26.0+** at runtime; build with the **iOS 26.2 SDK / Xcode 26.2** or later.
- Enable the **Declared Age Range** capability on your App ID in the Apple
  Developer portal. The plugin adds the `com.apple.developer.declared-age-range`
  entitlement to your build automatically.
- The Swift bridge is wired up via `cordova-plugin-add-swift-support`.

## Usage

```js
document.addEventListener('deviceready', async () => {
  const ageVerification = cordova.plugins.ageVerification;

  // Optional: check availability first.
  const { supported } = await ageVerification.isSupported();
  if (!supported) return;

  try {
    const result = await ageVerification.requestAgeRange({ ageGates: [13, 16, 18] });

    if (!result.available) {
      // No age data (declined, unknown region, unsupported OS). Apply your
      // most restrictive default experience.
      return;
    }

    const lower = result.lowerBound ?? 0;
    if (lower >= 18) {
      // adult experience
    } else if (lower >= 16) {
      // 16–17 experience
    } else {
      // restricted experience
    }
  } catch (err) {
    console.error('Age request failed', err);
  }
});
```

### TypeScript

```ts
import type { AgeRangeResult } from '@crowdhub/cordova-plugin-age-verification';

const result: AgeRangeResult = await cordova.plugins.ageVerification.requestAgeRange();
```

## API

### `requestAgeRange(options?): Promise<AgeRangeResult>`

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `ageGates` | `number \| number[]` | `[18]` | Age thresholds the app cares about. Used directly by iOS (up to three values). **Ignored on Android**, which returns its own Play Console-configured age bands. |

Resolves with an [`AgeRangeResult`](types/index.d.ts):

```ts
interface AgeRangeResult {
  platform: 'android' | 'ios';
  available: boolean;                 // true when usable age data was provided
  status: AgeAssuranceStatus;         // normalized status (see below)
  lowerBound: number | null;          // inclusive lower bound, or null
  upperBound: number | null;          // inclusive upper bound, or null
  declaration: 'selfDeclared' | 'guardianDeclared' | 'confirmed' | null;
  raw: AndroidAgeSignals | IosAgeRange; // platform-specific payload
}
```

**Normalized `status` values**

| Status | Source | Meaning |
| --- | --- | --- |
| `sharing` | iOS | User shared an age range. |
| `declined` | iOS | User declined to share. |
| `verified` | Android | Age verified (gov ID / payment / estimation). |
| `supervised` | Android | Supervised account; age set by a guardian. |
| `supervisedApprovalPending` | Android | Guardian approval pending. |
| `supervisedApprovalDenied` | Android | Guardian denied approval. |
| `declared` | Android | User declared their own age. |
| `unknown` | Android | Not verified/supervised in an applicable region. |
| `notAvailable` | both | No age data (OS/region/account or error). |

### `isSupported(): Promise<{ supported: boolean; platform: string; reason?: string }>`

Reports whether age assurance is available on the current OS version.

## How age data maps across platforms

- **Android** never returns an exact age; it returns a coarse band
  (`ageLower`/`ageUpper`) plus a verification status, and an `installId` you can
  persist to handle revoked guardian approvals.
- **iOS** never returns an exact age either; it returns bounds derived from the
  `ageGates` you requested. Apple may override your gates based on the user's
  region.

Use age data only for age-appropriate compliance — not for advertising,
marketing, profiling, or analytics. This is a contractual requirement of both
platform APIs.

## License

[MIT](LICENSE) © CrowdHub
