import type {UaParserResult} from './parser/result';
import {UaRules} from './rules';

/**
 * Android device model: the token after the `Android x;` (and optional
 * locale) segment, ending at `Build/`, `;`, or `)`. Matches both modern
 * (`Android 13; SM-S918B)`) and legacy (`Android 4.4.2; en-us; SM-T530
 * Build/KOT49H`) layouts.
 */
const ANDROID_MODEL_PATTERN = /\bAndroid [\d.]+;\s*(?:[a-z]{2}(?:-[A-Za-z]{2})?;\s*)?([^;)]+?)(?:\s+Build\/|[;)])/;

/** Capture values that are UA structure tokens, not device models. */
const ANDROID_NON_MODELS = new Set(['Mobile', 'Tablet', 'wv']);

/** Leading numeric segment of a version string, or `null`. */
function majorOf(version: string | null): number | null {
	if (version === null) {
		return null;
	}

	const major = parseInt(version, 10);
	return Number.isFinite(major) ? major : null;
}

/** Normalize a captured version: underscores (iOS/macOS) become dots. */
function versionOf(match: RegExpExecArray): string | null {
	if (typeof match[1] !== 'string') {
		return null;
	}

	return match[1].replace(/_/g, '.');
}

function browserOf(ua: string): UaParserResult['browser'] {
	for (const rule of UaRules.Browser) {
		const match = rule.pattern.exec(ua);
		if (!match) {
			continue;
		}

		const version = versionOf(match);
		return {name: rule.name, version: version, major: majorOf(version)};
	}

	return {name: null, version: null, major: null};
}

function engineOf(ua: string): UaParserResult['engine'] {
	for (const rule of UaRules.Engine) {
		const match = rule.pattern.exec(ua);
		if (!match) {
			continue;
		}

		return {name: rule.name, version: versionOf(match)};
	}

	return {name: null, version: null};
}

function osOf(ua: string): UaParserResult['os'] {
	for (const rule of UaRules.Os) {
		const match = rule.pattern.exec(ua);
		if (!match) {
			continue;
		}

		let version = versionOf(match);
		if (version !== null && rule.version) {
			version = rule.version(version);
		}

		return {name: rule.name, version: version};
	}

	return {name: null, version: null};
}

function cpuOf(ua: string): UaParserResult['cpu'] {
	for (const rule of UaRules.Cpu) {
		if (rule.pattern.test(ua)) {
			return {architecture: rule.architecture};
		}
	}

	return {architecture: null};
}

/** Vendor inferred from an Android model string, or `null`. */
function vendorOf(model: string): string | null {
	for (const [pattern, vendor] of UaRules.DeviceVendors) {
		if (pattern.test(model)) {
			return vendor;
		}
	}

	return null;
}

function deviceOf(ua: string): UaParserResult['device'] {
	// Apple handhelds.
	if (/\biPhone\b/.test(ua)) {
		return {vendor: 'Apple', model: 'iPhone', type: 'mobile'};
	}

	if (/\biPad\b/.test(ua)) {
		return {vendor: 'Apple', model: 'iPad', type: 'tablet'};
	}

	if (/\biPod\b/.test(ua)) {
		return {vendor: 'Apple', model: 'iPod touch', type: 'mobile'};
	}

	// Consoles. Model variants are re-matched separately because UAs like
	// 'PlayStation; PlayStation 5/2.26' hit the bare token first.
	if (/\bPlayStation\b/i.test(ua)) {
		const model = /\bPlayStation ?(5|4|3|Vita|Portable)\b/i.exec(ua);
		return {
			vendor: 'Sony',
			model: model ? `PlayStation ${model[1]}` : 'PlayStation',
			type: 'console'
		};
	}

	if (/\bXbox\b/i.test(ua)) {
		const model = /\bXbox (Series [XS]|One)\b/i.exec(ua);
		return {vendor: 'Microsoft', model: model ? `Xbox ${model[1]}` : 'Xbox', type: 'console'};
	}

	const nintendo = /\bNintendo (Switch|Wii ?U?|3DS)\b/i.exec(ua);
	if (nintendo) {
		return {vendor: 'Nintendo', model: nintendo[1], type: 'console'};
	}

	// Wearables.
	if (/\b(?:Apple ?Watch|Galaxy Watch|SM-R[89]\d{2})\b/i.test(ua)) {
		return {vendor: null, model: null, type: 'wearable'};
	}

	// Smart TVs & streaming devices.
	if (/\bCrKey\b/.test(ua)) {
		return {vendor: 'Google', model: 'Chromecast', type: 'smarttv'};
	}

	if (/\bRoku\b/i.test(ua)) {
		return {vendor: 'Roku', model: null, type: 'smarttv'};
	}

	if (/\bApple ?TV\b/i.test(ua)) {
		return {vendor: 'Apple', model: 'Apple TV', type: 'smarttv'};
	}

	if (/\bBRAVIA\b/i.test(ua)) {
		return {vendor: 'Sony', model: null, type: 'smarttv'};
	}

	if (/\b(?:web0s|webos)\b/i.test(ua)) {
		return {vendor: 'LG', model: null, type: 'smarttv'};
	}

	if (/\b(?:SmartTV|SMART-TV|HbbTV|NetCast|GoogleTV|Android TV|Viera|AquosBrowser|AFT[A-Z]\w+)\b/i.test(ua)) {
		return {vendor: null, model: null, type: 'smarttv'};
	}

	// Windows Phone.
	if (/\bWindows Phone\b/i.test(ua)) {
		return {vendor: null, model: null, type: 'mobile'};
	}

	// Android: model between the version segment and Build/close-paren.
	if (/\bAndroid\b/.test(ua)) {
		const type = /\bMobile\b/.test(ua) ? 'mobile' : 'tablet';
		const match = ANDROID_MODEL_PATTERN.exec(ua);
		const raw = match ? match[1].trim() : '';
		const model = raw && !ANDROID_NON_MODELS.has(raw) && !raw.startsWith('rv:') ? raw : null;

		return {vendor: model ? vendorOf(model) : null, model: model, type: type};
	}

	// Generic structure tokens (e.g. Firefox Mobile on non-Android).
	if (/\bMobile\b/.test(ua)) {
		return {vendor: null, model: null, type: 'mobile'};
	}

	if (/\bTablet\b/.test(ua)) {
		return {vendor: null, model: null, type: 'tablet'};
	}

	return {vendor: null, model: null, type: null};
}

function parse(ua?: string | null): UaParserResult {
	const value = typeof ua === 'string' ? ua : '';

	return {
		ua: value,
		browser: browserOf(value),
		engine: engineOf(value),
		os: osOf(value),
		device: deviceOf(value),
		cpu: cpuOf(value)
	};
}

/**
 * Dependency-free user agent string parser covering the `ua-parser-js`
 * feature set: browser name/version/major, rendering engine, OS, device
 * vendor/model/type, and CPU architecture. `parse` returns the full
 * breakdown; the per-section helpers parse just that slice.
 *
 * @category UaParser
 */
export const UaParser = {
	parse,
	browser(ua?: string | null): UaParserResult['browser'] {
		return browserOf(typeof ua === 'string' ? ua : '');
	},
	engine(ua?: string | null): UaParserResult['engine'] {
		return engineOf(typeof ua === 'string' ? ua : '');
	},
	os(ua?: string | null): UaParserResult['os'] {
		return osOf(typeof ua === 'string' ? ua : '');
	},
	device(ua?: string | null): UaParserResult['device'] {
		return deviceOf(typeof ua === 'string' ? ua : '');
	},
	cpu(ua?: string | null): UaParserResult['cpu'] {
		return cpuOf(typeof ua === 'string' ? ua : '');
	}
} as const;
