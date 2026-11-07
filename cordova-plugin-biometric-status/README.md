# cordova-plugin-biometric-status

Ask the device whether biometrics are usable **without showing a prompt**.

Most Cordova biometric plugins are built around authenticating the user: you call them,
the system dialog appears, and you find out what the device supports by watching it
fail. This plugin does only the part that comes before that — it reads biometric state
and returns it. Nothing is displayed, no sensor is armed, the user sees nothing.

It wraps `BiometricManager.canAuthenticate()` on Android and
`LAContext.canEvaluatePolicy()` on iOS, and normalises both into one small vocabulary so
calling code does not have to branch per platform.

Typical use: decide at runtime whether to *offer* a fingerprint/Face ID option at all, or
whether to fall back to a PIN, a password or an OTP.

- **Platforms:** Android (API 23+), iOS (11+)
- **License:** MIT

## Install

```sh
cordova plugin add cordova-plugin-biometric-status
```

or straight from source:

```sh
cordova plugin add https://github.com/sahakyan-tigran/cordova-plugin-biometric-status.git
```

The iOS side is written in Swift. If your project does not already build Swift, add:

```sh
cordova plugin add cordova-plugin-add-swift-support
```

## Usage

The plugin clobbers `window.BiometricStatus` and is ready after `deviceready`. Both
methods return a Promise when called without callbacks, and accept
`(success, error)` callbacks when you prefer those.

```js
document.addEventListener('deviceready', function () {
  BiometricStatus.check().then(function (result) {
    console.log(result.status); // 'available', 'none_enrolled', ...
  });
});
```

### `check([strength])`

Reads the current state. Resolves for **every** device state — a device with no sensor is
a normal answer, not an error — so in practice you branch on `result.status` and the
rejection path only fires on an unexpected native failure.

```js
BiometricStatus.check('strong').then(function (result) {
  // { code: 0, status: 'available', sdk: 34 }                    (Android)
  // { code: 0, status: 'available', biometry: 'face' }           (iOS)
});
```

`strength` is `'strong'` (default) or `'weak'`, and maps to `BIOMETRIC_STRONG` /
`BIOMETRIC_WEAK` on Android. iOS has no weak/strong split — Touch ID and Face ID are
always the equivalent of Android's Class 3 — so the argument is accepted for parity and
ignored there.

**Result fields**

| Field | Platform | Meaning |
| --- | --- | --- |
| `status` | both | The cross-platform value below. The only field worth branching on. |
| `code` | both | The raw native value behind `status` (`BiometricManager` code on Android, `LAError` code on iOS). Useful in logs. |
| `sdk` | Android | `Build.VERSION.SDK_INT`. |
| `biometry` | iOS | `'face'`, `'finger'`, `'none'` or `'unknown'`. |
| `message` | iOS | The system's own description, when it supplied one. |

**`status` values**

| Value | Platform | Meaning |
| --- | --- | --- |
| `available` | both | Biometrics are usable right now. |
| `none_enrolled` | both | Hardware is present, but no fingerprint or face is enrolled. |
| `unknown` | both | State could not be determined. |
| `no_hardware` | Android | No biometric sensor on this device. |
| `hw_unavailable` | Android | Sensor momentarily unavailable. Transient. |
| `not_enabled_for_apps` | Android | Android 16+: the user turned off "Verify in all apps". |
| `security_update_required` | Android | A security update is needed before biometrics can be used. |
| `unsupported` | Android | The requested strength is not supported on this device. |
| `error` | Android | An unmapped `BiometricManager` code; see `code`. |
| `unavailable` | iOS | No sensor, **or** the user denied biometry for this app — iOS reports both with the same `LAError` code and they cannot be told apart. Android keeps them apart as `no_hardware` and `not_enabled_for_apps`. |
| `lockout` | iOS | Too many failed attempts. Transient — clears on the next passcode unlock. |
| `passcode_not_set` | iOS | No device passcode, so nothing can be enrolled. |

### `openSettings()`

Sends the user somewhere they can do something about a negative result.

```js
BiometricStatus.openSettings();
```

On Android this is the biometric **enrollment** screen (`ACTION_BIOMETRIC_ENROLL` on
API 30+, falling back to the security settings on older releases, and again to security
settings if the enrollment intent is unavailable).

On iOS there is no system screen for enrolling a biometric from an app, so this opens the
app's own settings page — which is where its Face ID switch lives, and therefore the
useful destination for the `unavailable` case.

### Deciding "can I offer biometrics?"

The statuses split into *usable now* and *not usable now*. A practical reading:

```js
var UNUSABLE = [
  'none_enrolled',
  'no_hardware',
  'not_enabled_for_apps',
  'security_update_required',
  'unsupported',
  'unavailable',
  'passcode_not_set'
];

function isBiometricsAvailable() {
  // Browser / desktop builds where the plugin is not installed.
  if (!window.BiometricStatus) {
    return Promise.resolve(true);
  }

  return BiometricStatus.check('strong')
    .then(function (result) {
      return UNUSABLE.indexOf(result.status) === -1;
    })
    .catch(function () {
      return true; // don't hide a working option because the check failed
    });
}
```

`hw_unavailable` and `lockout` are deliberately left out of that list: both are temporary,
and the sensor will usually work again moments later, so hiding the option for them tends
to be worse than letting the user try.

## Platform notes

### Android

- Adds `android.permission.USE_BIOMETRIC` to the manifest. It is a normal permission —
  nothing is requested at runtime.
- Pulls in `androidx.biometric:biometric:1.1.0`, so the project needs AndroidX
  (`cordova-android` 9+).
- `not_enabled_for_apps` is the Android 16 (API 36) `BIOMETRIC_ERROR_NOT_ENABLED_FOR_APPS`
  code. It is compared numerically so the plugin still compiles against older SDKs.
- The check runs on Cordova's thread pool; `openSettings` runs on the UI thread.

### iOS

- Links `LocalAuthentication.framework`. Nothing else.
- **`NSFaceIDUsageDescription` is intentionally not declared by this plugin.** It only
  reads state via `canEvaluatePolicy` and never evaluates a policy, so the key is not
  required for the check itself; and a plugin that writes the key would collide with any
  other plugin doing the same, leaving whichever was installed last in the built app. If
  your app evaluates Face ID anywhere — most likely through another plugin — declare it
  once in your own `config.xml`:

  ```xml
  <platform name="ios">
    <edit-config target="NSFaceIDUsageDescription" file="*-Info.plist" mode="merge">
      <string>Used to sign you in with Face ID.</string>
    </edit-config>
  </platform>
  ```

- `biometryType` is only meaningful after `canEvaluatePolicy` has run, which is why
  `biometry` is read after the call rather than before.

## Contributing

Issues and pull requests are welcome. There is no build step — the plugin is the source.
When adding a status value, add it to both platforms where the concept exists on both,
and to the table above.

## License

MIT — see [LICENSE](LICENSE).
