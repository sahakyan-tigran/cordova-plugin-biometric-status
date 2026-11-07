// Type definitions for cordova-plugin-biometric-status

/**
 * The cross-platform status vocabulary. This is the only field worth
 * branching on.
 */
export type BiometricStatusValue =
	// both platforms
	| 'available'
	| 'none_enrolled'
	| 'unknown'
	// Android only
	| 'no_hardware'
	| 'hw_unavailable'
	| 'not_enabled_for_apps'
	| 'security_update_required'
	| 'unsupported'
	| 'error'
	// iOS only
	| 'unavailable'
	| 'lockout'
	| 'passcode_not_set';

/** Which sensor the device has. iOS only. */
export type BiometryKind = 'face' | 'finger' | 'optic' | 'none' | 'unknown';

/** Android maps this to BIOMETRIC_STRONG / BIOMETRIC_WEAK. iOS ignores it. */
export type BiometricStrength = 'strong' | 'weak';

export interface BiometricStatusResult {
	/** The cross-platform value. Branch on this. */
	status: BiometricStatusValue;

	/**
	 * The raw native value behind `status`: a `BiometricManager` code on
	 * Android, an `LAError` code on iOS. Useful in logs.
	 */
	code: number;

	/** `Build.VERSION.SDK_INT`. Android only. */
	sdk?: number;

	/** Which sensor the device has. iOS only. */
	biometry?: BiometryKind;

	/** The system's own description, when it supplied one. iOS only. */
	message?: string;
}

export interface BiometricStatusPlugin {
	/**
	 * Reads the current biometric state without showing a prompt.
	 *
	 * Resolves for every device state -- a device with no sensor is a normal
	 * answer, not an error -- so in practice you branch on `result.status`
	 * and the rejection path only fires on an unexpected native failure.
	 */
	check(strength?: BiometricStrength): Promise<BiometricStatusResult>;
	check(
		strength: BiometricStrength,
		success: (result: BiometricStatusResult) => void,
		error?: (message: string) => void
	): void;
	check(
		success: (result: BiometricStatusResult) => void,
		error?: (message: string) => void
	): void;

	/**
	 * Sends the user somewhere they can act on a negative result: the
	 * biometric enrollment screen on Android, the app's own settings page on
	 * iOS.
	 */
	openSettings(): Promise<void>;
	openSettings(success: () => void, error?: (message: string) => void): void;
}

declare global {
	interface Window {
		BiometricStatus: BiometricStatusPlugin;
	}

	const BiometricStatus: BiometricStatusPlugin;
}

declare const plugin: BiometricStatusPlugin;
export default plugin;
