import Foundation
import LocalAuthentication
import UIKit

@objc(BiometricStatus) class BiometricStatus: CDVPlugin {

    /**
     * Silent check, never shows a prompt.
     *
     * The strength argument is accepted for parity with Android and ignored:
     * iOS has no weak/strong split, Touch ID and Face ID are always the
     * equivalent of Android's Class 3.
     *
     * Reports through success for every device state, like the Android side,
     * so the caller only ever branches on "status".
     */
    @objc(check:)
    func check(_ command: CDVInvokedUrlCommand) {
        commandDelegate.run(inBackground: {
            let context = LAContext()
            var error: NSError?
            let available = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                                                      error: &error)

            // biometryType is only meaningful once canEvaluatePolicy has run.
            var result: [String: Any] = [
                "code": available ? 0 : (error?.code ?? 0),
                "status": available ? "available" : BiometricStatus.toStatus(error),
                "biometry": BiometricStatus.toBiometry(context.biometryType)
            ]
            if let message = error?.localizedDescription {
                result["message"] = message
            }

            self.commandDelegate.send(
                CDVPluginResult(status: CDVCommandStatus_OK, messageAs: result),
                callbackId: command.callbackId)
        })
    }

    /**
     * Opens the app's own settings page, which is where the Face ID switch for
     * this app lives. iOS has no counterpart to Android's "enroll a biometric"
     * intent, so this is as close as the system gets.
     */
    @objc(openSettings:)
    func openSettings(_ command: CDVInvokedUrlCommand) {
        DispatchQueue.main.async {
            // cordova-plugin-add-swift-support compiles the app in Swift 4.0 mode,
            // where this constant still has its pre-4.2 name.
            #if swift(>=4.2)
            let settingsURLString = UIApplication.openSettingsURLString
            #else
            let settingsURLString = UIApplicationOpenSettingsURLString
            #endif

            guard let url = URL(string: settingsURLString) else {
                self.commandDelegate.send(
                    CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Settings URL unavailable"),
                    callbackId: command.callbackId)
                return
            }

            UIApplication.shared.open(url, options: [:]) { opened in
                let result = opened
                    ? CDVPluginResult(status: CDVCommandStatus_OK)
                    : CDVPluginResult(status: CDVCommandStatus_ERROR, messageAs: "Could not open settings")
                self.commandDelegate.send(result, callbackId: command.callbackId)
            }
        }
    }

    private static func toStatus(_ error: NSError?) -> String {
        guard let error = error else { return "unknown" }

        switch error.code {
        case Int(kLAErrorBiometryNotEnrolled):
            return "none_enrolled"

        // iOS reports "this device has no biometric sensor" and "the user denied
        // biometry for this app" with the same code, so both land here. Android
        // keeps them apart as "no_hardware" and "not_enabled_for_apps".
        case Int(kLAErrorBiometryNotAvailable):
            return "unavailable"

        // Temporary: cleared by the next passcode unlock.
        case Int(kLAErrorBiometryLockout):
            return "lockout"

        // No device passcode, so nothing can be enrolled.
        case Int(kLAErrorPasscodeNotSet):
            return "passcode_not_set"

        default:
            return "unknown"
        }
    }

    private static func toBiometry(_ type: LABiometryType) -> String {
        // Optic ID (Vision Pro) was added in iOS 17. The compiler check keeps
        // the plugin building against older SDKs, where the case does not
        // exist; the availability check keeps it from being used on older
        // runtimes.
        #if compiler(>=5.9)
        if #available(iOS 17.0, *), type == .opticID {
            return "optic"
        }
        #endif

        switch type {
        case .faceID:  return "face"
        case .touchID: return "finger"
        case .none:    return "none"
        default:       return "unknown"
        }
    }
}
