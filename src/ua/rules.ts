import {UaOsRule} from './os/rule';
import {UaRule} from './rule';

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
 * Static rule tables used by `UaParser`. Each table is tried in order and
 * the first match wins, so ordering encodes specificity.
 *
 * @category UaParser
 */
export class UaRules {
	/**
	 * Browser rules. Every Chromium-derivative (Edge, Opera, Samsung, ...)
	 * must appear before the bare `Chrome/` rule — their user agents all
	 * carry a `Chrome/` token.
	 */
	public static readonly Browser: readonly UaRule[] = [
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
	public static readonly Engine: readonly UaRule[] = [
		{name: 'EdgeHTML', pattern: /\bEdge\/([\d.]+)/},
		{name: 'Trident', pattern: /\bTrident\/([\d.]+)/},
		{name: 'Presto', pattern: /\bPresto\/([\d.]+)/},
		{name: 'Goanna', pattern: /\bGoanna\/([\d.]+)/},
		{name: 'Blink', pattern: /\b(?:Chrome|Chromium)\/([\d.]+)/},
		{name: 'Gecko', pattern: /\brv:([\d.]+)[^)]*\)\s+Gecko\//},
		{name: 'Gecko', pattern: /\bGecko\/\S+/},
		{name: 'WebKit', pattern: /\bAppleWebKit\/([\d.]+)/}
	];

	/**
	 * OS rules in specificity order: Windows Phone before Windows, iOS before
	 * macOS (iPhone user agents contain 'like Mac OS X'), and Android /
	 * Chrome OS / Tizen / webOS before the generic Linux fallback.
	 */
	public static readonly Os: readonly UaOsRule[] = [
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
	public static readonly Cpu: ReadonlyArray<{architecture: string; pattern: RegExp}> = [
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
	public static readonly DeviceVendors: ReadonlyArray<[RegExp, string]> = [
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
}
