var exec = require('cordova/exec');

function call(action, args, success, error) {
  if (typeof success === 'function' || typeof error === 'function') {
    exec(success, error, 'BiometricStatus', action, args);
    return;
  }
  return new Promise(function (resolve, reject) {
    exec(resolve, reject, 'BiometricStatus', action, args);
  });
}

module.exports = {
  /**
   * Silent check, never shows a prompt.
   *
   * strength: "strong" (default) or "weak". Android only; iOS has no weak/strong
   * split and ignores it.
   *
   * Resolves with { code, status, ... } on both platforms. "status" is the
   * cross-platform vocabulary and the only field worth branching on; "code" is
   * the native value behind it (androidx BiometricManager on Android, LAError on
   * iOS) and is there for logging.
   *
   * Shared:
   *   available            biometrics are usable right now
   *   none_enrolled        no fingerprint/face enrolled
   *   unknown              state could not be determined
   *
   * Android only (plus "sdk", the API level):
   *   no_hardware                no sensor on this device
   *   hw_unavailable             sensor momentarily unavailable (transient)
   *   not_enabled_for_apps       Android 16+: "Verify in all apps" is off
   *   security_update_required   a security update is needed first
   *   unsupported                the requested strength is not supported
   *   error                      unmapped BiometricManager code
   *
   * iOS only (plus "biometry": "face" | "finger" | "optic" | "none" |
   * "unknown", and
   * "message" when the system supplied one):
   *   unavailable        no sensor, OR the user denied biometry for this app --
   *                      iOS reports both with the same LAError code
   *   lockout            too many failed attempts (transient, clears on the
   *                      next passcode unlock)
   *   passcode_not_set   no device passcode, so nothing can be enrolled
   */
  check: function (strength, success, error) {
    if (typeof strength === 'function') {
      error = success;
      success = strength;
      strength = 'strong';
    }
    return call('check', [strength || 'strong'], success, error);
  },

  /**
   * Opens biometric settings. On Android this is the enrollment screen, so the
   * user can enroll or enable biometrics; on iOS it is the app's own settings
   * page, which is where its Face ID switch lives.
   */
  openSettings: function (success, error) {
    return call('openSettings', [], success, error);
  }
};
