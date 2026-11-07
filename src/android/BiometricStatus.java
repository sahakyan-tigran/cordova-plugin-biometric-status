package cordova.plugin.biometricstatus;

import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricManager.Authenticators;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

public class BiometricStatus extends CordovaPlugin {

    // Added in Android 16 (API 36). Compared by number so it compiles
    // with older SDKs and does not break on older devices.
    private static final int ERROR_NOT_ENABLED_FOR_APPS = 21;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext cb) {
        if ("check".equals(action)) {
            String strength = args.optString(0, "strong");
            check(strength, cb);
            return true;
        }
        if ("openSettings".equals(action)) {
            openSettings(cb);
            return true;
        }
        return false;
    }

    private void check(String strength, CallbackContext cb) {
        cordova.getThreadPool().execute(() -> {
            try {
                int authenticators = "weak".equalsIgnoreCase(strength)
                        ? Authenticators.BIOMETRIC_WEAK
                        : Authenticators.BIOMETRIC_STRONG;

                BiometricManager bm = BiometricManager.from(cordova.getContext());
                int code = bm.canAuthenticate(authenticators);

                JSONObject result = new JSONObject();
                result.put("code", code);
                result.put("status", toStatus(code));
                result.put("sdk", Build.VERSION.SDK_INT);
                cb.success(result);
            } catch (Exception e) {
                cb.error(e.getMessage());
            }
        });
    }

    private String toStatus(int code) {
        switch (code) {
            case BiometricManager.BIOMETRIC_SUCCESS:                        return "available";
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:            return "none_enrolled";
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:              return "no_hardware";
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:           return "hw_unavailable";
            case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED: return "security_update_required";
            case BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED:              return "unsupported";
            case BiometricManager.BIOMETRIC_STATUS_UNKNOWN:                 return "unknown";
            case ERROR_NOT_ENABLED_FOR_APPS:                                return "not_enabled_for_apps";
            default:                                                        return "error";
        }
    }

    private void openSettings(CallbackContext cb) {
        cordova.getActivity().runOnUiThread(() -> {
            try {
                Intent intent;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    intent = new Intent(Settings.ACTION_BIOMETRIC_ENROLL);
                    intent.putExtra(Settings.EXTRA_BIOMETRIC_AUTHENTICATORS_ALLOWED,
                            Authenticators.BIOMETRIC_STRONG);
                } else {
                    intent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                cordova.getActivity().startActivity(intent);
                cb.success();
            } catch (Exception e) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_SECURITY_SETTINGS);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    cordova.getActivity().startActivity(fallback);
                    cb.success();
                } catch (Exception e2) {
                    cb.error(e2.getMessage());
                }
            }
        });
    }
}
