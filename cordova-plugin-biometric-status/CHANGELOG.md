# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0]

Initial release.

- `check([strength])` — silent biometric state read, no prompt. Wraps
  `BiometricManager.canAuthenticate()` on Android and `LAContext.canEvaluatePolicy()` on
  iOS, normalised to a shared `status` vocabulary.
- `openSettings()` — biometric enrollment screen on Android, the app's settings page on
  iOS.
- Android 16 `BIOMETRIC_ERROR_NOT_ENABLED_FOR_APPS` mapped to `not_enabled_for_apps`.
