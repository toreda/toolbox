/**
 * Parsed user agent breakdown returned by `UaParser.parse`. Every field a
 * user agent string doesn't expose is `null` — no field is ever omitted,
 * so results are safe to destructure without existence checks.
 *
 * @category UaParser
 */
export interface UaParserResult {
	/** The raw user agent string the result was parsed from ('' when absent). */
	ua: string;
	browser: {
		/** Browser name, e.g. `'Chrome'`, `'Firefox'`, `'Safari'`, `'Edge'`. */
		name: string | null;
		/** Full version string as reported, e.g. `'126.0.0.0'`. */
		version: string | null;
		/** Leading numeric segment of `version`, e.g. `126`. */
		major: number | null;
	};
	engine: {
		/** Rendering engine, e.g. `'Blink'`, `'Gecko'`, `'WebKit'`, `'Trident'`. */
		name: string | null;
		version: string | null;
	};
	os: {
		/** Operating system, e.g. `'Windows'`, `'macOS'`, `'iOS'`, `'Android'`. */
		name: string | null;
		/** Marketing version where known (`'10'` for Windows NT 10.0, `'17.5'` for iOS). */
		version: string | null;
	};
	device: {
		/** Hardware vendor where detectable, e.g. `'Apple'`, `'Samsung'`. */
		vendor: string | null;
		/** Device model, e.g. `'iPhone'`, `'SM-S918B'`, `'Pixel 8'`. */
		model: string | null;
		/** Device class. `null` means an ordinary desktop/laptop browser. */
		type: 'mobile' | 'tablet' | 'console' | 'smarttv' | 'wearable' | 'embedded' | null;
	};
	cpu: {
		/** CPU architecture, e.g. `'amd64'`, `'arm64'`, `'ia32'`. */
		architecture: string | null;
	};
}
