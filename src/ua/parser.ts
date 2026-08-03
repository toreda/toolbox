import type {UaParserResult} from './parser/result';

/** Ordered browser matcher. Capture group 1 (when present) is the version. */
type UaRule = {name: string; pattern: RegExp};

/** OS matcher with an optional raw-version transform (e.g. NT → marketing). */
type UaOsRule = {name: string; pattern: RegExp; version?: (raw: string) => string};

/**
 * Browser rules are tried in order and the first match wins, so every
 * Chromium-derivative (Edge, Opera, Samsung, ...) must appear before the
 * bare `Chrome/` rule — their user agents all carry a `Chrome/` token.
 */
const BROWSER_RULES: readonly UaRule[] = [
	{name: 'Edge', pattern: /\bEdgiOS\/([\d.]+)/},
	{name: 'Edge', pattern: /\bEdgA\/([\d.]+)/},
	{name: 'Edge', pattern: /\bEdg\/([\d.]+)/},
	{name: 'Edge', pattern: /\bEdge\/([\d.]+)/},
	{name: 'Opera Mini', pattern: /\bOpera Mini\/([\d.]+)/},
	{name: 'Opera', pattern: /\bOPR\/([\d.]+)/},
	{name: 'Opera', pattern: /\bOpera\/[\d.]+.*\bVersion\/([\d.]+)/},
	{name: 'Opera', pattern: /\bOpera[/ ]([\d.]+)/},
	{name: 'Samsung Internet', pattern: /\bSamsungBrowser\/([\d.]+)/},
	{name: 'UC Browser', pattern: /\bUCBrowser\/([\d.]+)/},
	{name: 'Yandex Browser', pattern: /\bYaBrowser\/([\d.]+)/},
	{name: 'Vivaldi', pattern: /\bVivaldi\/([\d.]+)/},
	{name: 'Brave', pattern: /\bBrave\/([\d.]+)/},
	{name: 'Electron', pattern: /\bElectron\/([\d.]+)/},
	{name: 'Firefox', pattern: /\bFxiOS\/([\d.]+)/},
	{name: 'Firefox', pattern: /\bFirefox\/([\d.]+)/},
	{name: 'Chrome', pattern: /\bCriOS\/([\d.]+)/},
	{name: 'Chrome WebView', pattern: /; wv\).*?\bChrome\/([\d.]+)/},
	{name: 'Chromium', pattern: /\bChromium\/([\d.]+)/},
	{name: 'Chrome', pattern: /\bChrome\/([\d.]+)/},
	{name: 'Internet Explorer', pattern: /\bMSIE ([\d.]+)/},
	{name: 'Internet Explorer', pattern: /\bTrident\/[\d.]+.*\brv:([\d.]+)/},
	{name: 'Mobile Safari', pattern: /\bVersion\/([\d.]+).*\bMobile\/?\S*\s+Safari\//},
	{name: 'Safari', pattern: /\bVersion\/([\d.]+).*\bSafari\//},
	// Safari with no Version token reports no version — the Safari/xxx
	// number is a WebKit build, not the browser version.
	{name: 'Safari', pattern: /\bSafari\/[\d.]+/}
];

/**
 * Rendering engine rules. Legacy engines (EdgeHTML, Trident, Presto) are
 * checked first since their user agents also contain WebKit-lineage
 * tokens. `Chrome/` implies Blink; iOS browsers (CriOS/FxiOS) have no
 * `Chrome/` token and correctly fall through to WebKit.
 */
const ENGINE_RULES: readonly UaRule[] = [
	{name: 'EdgeHTML', pattern: /\bEdge\/([\d.]+)/},
	{name: 'Trident', pattern: /\bTrident\/([\d.]+)/},
	{name: 'Presto', pattern: /\bPresto\/([\d.]+)/},
	{name: 'Goanna', pattern: /\bGoanna\/([\d.]+)/},
	{name: 'Blink', pattern: /\b(?:Chrome|Chromium)\/([\d.]+)/},
	{name: 'Gecko', pattern: /\brv:([\d.]+)[^)]*\)\s+Gecko\//},
	{name: 'Gecko', pattern: /\bGecko\/\S+/},
	{name: 'WebKit', pattern: /\bAppleWebKit\/([\d.]+)/}
];

/** Windows NT version → marketing version. */
const WINDOWS_NT_VERSIONS: Readonly<Record<string, string>> = {
	'10.0': '10',
	'6.3': '8.1',
	'6.2': '8',
	'6.1': '7',
	'6.0': 'Vista',
	'5.2': 'XP',
	'5.1': 'XP'
};

/**
 * OS rules in specificity order: Windows Phone before Windows, iOS before
 * macOS (iPhone user agents contain 'like Mac OS X'), and Android /
 * Chrome OS / Tizen / webOS before the generic Linux fallback.
 */
const OS_RULES: readonly UaOsRule[] = [
	{name: 'Windows Phone', pattern: /\bWindows Phone(?: OS)?(?: ([\d.]+))?/},
	{
		name: 'Windows',
		pattern: /\bWindows NT ([\d.]+)/,
		version: (raw) => WINDOWS_NT_VERSIONS[raw] ?? raw
	},
	{name: 'Windows', pattern: /\bWindows\b/},
	{name: 'iOS', pattern: /\b(?:iPhone )?OS ([\d_]+) like Mac OS X/},
	{name: 'iOS', pattern: /\b(?:iPhone|iPad|iPod)\b/},
	{name: 'Android', pattern: /\bAndroid ([\d.]+)/},
	{name: 'Android', pattern: /\bAndroid\b/},
	{name: 'Chrome OS', pattern: /\bCrOS (?:\S+ )?([\d.]+)/},
	{name: 'macOS', pattern: /\bMac OS X ([\d._]+)/},
	{name: 'macOS', pattern: /\bMacintosh\b/},
	{name: 'Tizen', pattern: /\bTizen[/ ]([\d.]+)/},
	{name: 'Tizen', pattern: /\bTizen\b/},
	{name: 'webOS', pattern: /\b(?:web0s|webos)(?:\.tv)?(?:\/([\d.]+))?/i},
	{name: 'PlayStation', pattern: /\bPlayStation\b/},
	{name: 'Ubuntu', pattern: /\bUbuntu(?:[/ ]([\d.]+))?/},
	{name: 'Fedora', pattern: /\bFedora(?:[/ ]([\d.]+))?/},
	{name: 'Debian', pattern: /\bDebian\b/},
	{name: 'FreeBSD', pattern: /\bFreeBSD\b/},
	{name: 'OpenBSD', pattern: /\bOpenBSD\b/},
	{name: 'NetBSD', pattern: /\bNetBSD\b/},
	{name: 'Linux', pattern: /\bLinux\b/}
];

/** CPU architecture rules. amd64 tokens must be checked before bare x86/arm. */
const CPU_RULES: ReadonlyArray<{architecture: string; pattern: RegExp}> = [
	{architecture: 'amd64', pattern: /\b(?:x86_64|x64|Win64|WOW64|amd64)\b/i},
	{architecture: 'ia64', pattern: /\b(?:ia64|itanium)\b/i},
	{architecture: 'ia32', pattern: /\b(?:i[3-6]86|ia32|x86)\b/i},
	{architecture: 'arm64', pattern: /\b(?:aarch64|arm64|armv8\w*)\b/i},
	{architecture: 'armhf', pattern: /\barm\w*hf\b/i},
	{architecture: 'arm', pattern: /\barm(?:v\d+\w*)?\b/i},
	{architecture: 'ppc', pattern: /\b(?:ppc|powerpc)\w*\b/i},
	{architecture: 'sparc', pattern: /\bsparc(?:64)?\b/i},
	{architecture: 'mips', pattern: /\bmips(?:64)?\b/i}
];

/** Android model prefix → hardware vendor. First match wins. */
const DEVICE_VENDORS: ReadonlyArray<[RegExp, string]> = [
	[/^(?:SM-|GT-|SGH-|SCH-|SHV-)|Galaxy/i, 'Samsung'],
	[/^(?:Pixel|Nexus)\b/i, 'Google'],
	[/^(?:Redmi|POCO)|Xiaomi|^Mi\b/i, 'Xiaomi'],
	[/^(?:moto|XT\d{3,})/i, 'Motorola'],
	[/HUAWEI|HONOR/i, 'Huawei'],
	[/OnePlus/i, 'OnePlus'],
	[/^CPH\d{4}/, 'OPPO'],
	[/^(?:LM-|LG-)/, 'LG'],
	[/^(?:Lenovo|TB-)/i, 'Lenovo'],
	[/^vivo|^V2\d{3}/i, 'vivo'],
	[/^RMX\d{4}/, 'Realme'],
	[/^Nokia/i, 'Nokia'],
	[/^(?:SO-|SOV|XQ-)/, 'Sony'],
	[/^(?:ASUS|ZenFone)/i, 'ASUS'],
	[/^HTC/i, 'HTC']
];

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
	for (const rule of BROWSER_RULES) {
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
	for (const rule of ENGINE_RULES) {
		const match = rule.pattern.exec(ua);
		if (!match) {
			continue;
		}

		return {name: rule.name, version: versionOf(match)};
	}

	return {name: null, version: null};
}

function osOf(ua: string): UaParserResult['os'] {
	for (const rule of OS_RULES) {
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
	for (const rule of CPU_RULES) {
		if (rule.pattern.test(ua)) {
			return {architecture: rule.architecture};
		}
	}

	return {architecture: null};
}

/** Vendor inferred from an Android model string, or `null`. */
function vendorOf(model: string): string | null {
	for (const [pattern, vendor] of DEVICE_VENDORS) {
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
