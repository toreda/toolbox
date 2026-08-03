import {UaParser} from 'src/ua/parser';

const UA = {
	chromeWindows:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
		'Chrome/126.0.0.0 Safari/537.36',
	edgeWindows:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
		'Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.87',
	firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0',
	safariMac:
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
		'Version/17.5 Safari/605.1.15',
	safariIphone:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 ' +
		'(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
	chromeIos:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 ' +
		'(KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
	safariIpad:
		'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
		'Version/16.6 Mobile/15E148 Safari/604.1',
	chromeAndroidSamsung:
		'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) ' +
		'Chrome/126.0.0.0 Mobile Safari/537.36',
	chromeAndroidPixel:
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) ' +
		'Chrome/126.0.0.0 Mobile Safari/537.36',
	chromeAndroidReduced:
		'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) ' +
		'Chrome/126.0.0.0 Mobile Safari/537.36',
	androidWebView:
		'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 ' +
		'(KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36',
	samsungInternet:
		'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) ' +
		'SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
	firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:126.0) Gecko/126.0 Firefox/126.0',
	galaxyTabLegacy:
		'Mozilla/5.0 (Linux; Android 4.4.2; en-us; SM-T530 Build/KOT49H) AppleWebKit/537.36 ' +
		'(KHTML, like Gecko) Chrome/33.0.0.0 Safari/537.36',
	operaWindows:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
		'Chrome/125.0.0.0 Safari/537.36 OPR/111.0.0.0',
	ie11: 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
	ie10: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Win64; x64; Trident/6.0)',
	windowsPhone:
		'Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; Lumia 950) AppleWebKit/537.36 ' +
		'(KHTML, like Gecko) Chrome/52.0.2743.116 Mobile Safari/537.36 Edge/15.15254',
	chromebook:
		'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) ' +
		'Chrome/125.0.0.0 Safari/537.36',
	ps5: 'Mozilla/5.0 (PlayStation; PlayStation 5/2.26) AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
		'Version/13.0 Safari/605.1.15',
	xbox:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 ' +
		'(KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36 Edge/20.02',
	nintendoSwitch:
		'Mozilla/5.0 (Nintendo Switch; WifiWebAuthApplet) AppleWebKit/606.4 (KHTML, like Gecko) ' +
		'NF/6.0.1.15.4 NintendoBrowser/5.1.0.20393',
	lgTv:
		'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) ' +
		'Chrome/79.0.3945.79 Safari/537.36 WebAppManager',
	samsungTv:
		'Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) ' +
		'76.0.3809.146/6.0 TV Safari/537.36',
	chromecast: 'Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) ' +
		'Chrome/88.0.4324.208 Safari/537.36 CrKey/1.54.250320',
	macArmHint: 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
		'Chrome/126.0.0.0 Safari/537.36'
};

describe('UaParser', () => {
	describe('parse', () => {
		it('should return all-null fields for empty or missing input', () => {
			for (const input of ['', null, undefined]) {
				const result = UaParser.parse(input);
				expect(result.ua).toBe('');
				expect(result.browser).toEqual({name: null, version: null, major: null});
				expect(result.engine).toEqual({name: null, version: null});
				expect(result.os).toEqual({name: null, version: null});
				expect(result.device).toEqual({vendor: null, model: null, type: null});
				expect(result.cpu).toEqual({architecture: null});
			}
		});

		it('should echo the raw user agent', () => {
			expect(UaParser.parse(UA.chromeWindows).ua).toBe(UA.chromeWindows);
		});

		it('should parse desktop Chrome on Windows', () => {
			const result = UaParser.parse(UA.chromeWindows);
			expect(result.browser).toEqual({name: 'Chrome', version: '126.0.0.0', major: 126});
			expect(result.engine).toEqual({name: 'Blink', version: '126.0.0.0'});
			expect(result.os).toEqual({name: 'Windows', version: '10'});
			expect(result.device.type).toBeNull();
			expect(result.cpu.architecture).toBe('amd64');
		});

		it('should parse Edge (Chromium) rather than Chrome', () => {
			const result = UaParser.parse(UA.edgeWindows);
			expect(result.browser.name).toBe('Edge');
			expect(result.browser.major).toBe(126);
			expect(result.engine.name).toBe('Blink');
		});

		it('should parse Firefox on Linux', () => {
			const result = UaParser.parse(UA.firefoxLinux);
			expect(result.browser).toEqual({name: 'Firefox', version: '126.0', major: 126});
			expect(result.engine).toEqual({name: 'Gecko', version: '126.0'});
			expect(result.os.name).toBe('Linux');
			expect(result.cpu.architecture).toBe('amd64');
		});

		it('should parse Safari on macOS', () => {
			const result = UaParser.parse(UA.safariMac);
			expect(result.browser).toEqual({name: 'Safari', version: '17.5', major: 17});
			expect(result.engine).toEqual({name: 'WebKit', version: '605.1.15'});
			expect(result.os).toEqual({name: 'macOS', version: '10.15.7'});
			expect(result.device.type).toBeNull();
		});

		it('should parse Mobile Safari on iPhone', () => {
			const result = UaParser.parse(UA.safariIphone);
			expect(result.browser.name).toBe('Mobile Safari');
			expect(result.browser.version).toBe('17.5');
			expect(result.engine.name).toBe('WebKit');
			expect(result.os).toEqual({name: 'iOS', version: '17.5'});
			expect(result.device).toEqual({vendor: 'Apple', model: 'iPhone', type: 'mobile'});
		});

		it('should parse Chrome on iOS as Chrome over WebKit', () => {
			const result = UaParser.parse(UA.chromeIos);
			expect(result.browser.name).toBe('Chrome');
			expect(result.browser.major).toBe(126);
			expect(result.engine.name).toBe('WebKit');
			expect(result.os.name).toBe('iOS');
		});

		it('should parse iPad as an Apple tablet', () => {
			const result = UaParser.parse(UA.safariIpad);
			expect(result.os).toEqual({name: 'iOS', version: '16.6'});
			expect(result.device).toEqual({vendor: 'Apple', model: 'iPad', type: 'tablet'});
		});

		it('should parse a Samsung Android phone', () => {
			const result = UaParser.parse(UA.chromeAndroidSamsung);
			expect(result.browser.name).toBe('Chrome');
			expect(result.os).toEqual({name: 'Android', version: '13'});
			expect(result.device).toEqual({vendor: 'Samsung', model: 'SM-S918B', type: 'mobile'});
		});

		it('should parse a Pixel as a Google device', () => {
			const result = UaParser.parse(UA.chromeAndroidPixel);
			expect(result.device).toEqual({vendor: 'Google', model: 'Pixel 8', type: 'mobile'});
		});

		it('should keep the reduced-UA model K without inventing a vendor', () => {
			const result = UaParser.parse(UA.chromeAndroidReduced);
			expect(result.device).toEqual({vendor: null, model: 'K', type: 'mobile'});
		});

		it('should detect Android WebView', () => {
			const result = UaParser.parse(UA.androidWebView);
			expect(result.browser.name).toBe('Chrome WebView');
			expect(result.browser.major).toBe(126);
			expect(result.device.model).toBe('SM-A536B');
		});

		it('should parse Samsung Internet rather than Chrome', () => {
			const result = UaParser.parse(UA.samsungInternet);
			expect(result.browser).toEqual({name: 'Samsung Internet', version: '25.0', major: 25});
			expect(result.engine.name).toBe('Blink');
		});

		it('should parse Firefox on Android without a bogus model', () => {
			const result = UaParser.parse(UA.firefoxAndroid);
			expect(result.browser.name).toBe('Firefox');
			expect(result.os.name).toBe('Android');
			expect(result.device).toEqual({vendor: null, model: null, type: 'mobile'});
		});

		it('should parse a legacy Android tablet with locale and Build token', () => {
			const result = UaParser.parse(UA.galaxyTabLegacy);
			expect(result.device).toEqual({vendor: 'Samsung', model: 'SM-T530', type: 'tablet'});
			expect(result.os).toEqual({name: 'Android', version: '4.4.2'});
		});

		it('should parse Opera via the OPR token', () => {
			const result = UaParser.parse(UA.operaWindows);
			expect(result.browser).toEqual({name: 'Opera', version: '111.0.0.0', major: 111});
		});

		it('should parse IE11 from the Trident rv token', () => {
			const result = UaParser.parse(UA.ie11);
			expect(result.browser).toEqual({name: 'Internet Explorer', version: '11.0', major: 11});
			expect(result.engine).toEqual({name: 'Trident', version: '7.0'});
			expect(result.os).toEqual({name: 'Windows', version: '7'});
			expect(result.cpu.architecture).toBe('amd64');
		});

		it('should parse IE10 from the MSIE token', () => {
			const result = UaParser.parse(UA.ie10);
			expect(result.browser).toEqual({name: 'Internet Explorer', version: '10.0', major: 10});
			expect(result.os).toEqual({name: 'Windows', version: '8'});
		});

		it('should parse Windows Phone with legacy Edge', () => {
			const result = UaParser.parse(UA.windowsPhone);
			expect(result.browser.name).toBe('Edge');
			expect(result.engine.name).toBe('EdgeHTML');
			expect(result.os).toEqual({name: 'Windows Phone', version: '10.0'});
			expect(result.device.type).toBe('mobile');
		});

		it('should parse Chrome OS', () => {
			const result = UaParser.parse(UA.chromebook);
			expect(result.os).toEqual({name: 'Chrome OS', version: '14541.0.0'});
			expect(result.cpu.architecture).toBe('amd64');
		});

		it('should parse a PlayStation 5 as a Sony console', () => {
			const result = UaParser.parse(UA.ps5);
			expect(result.device).toEqual({vendor: 'Sony', model: 'PlayStation 5', type: 'console'});
			expect(result.os.name).toBe('PlayStation');
		});

		it('should parse an Xbox as a Microsoft console on Windows', () => {
			const result = UaParser.parse(UA.xbox);
			expect(result.device).toEqual({vendor: 'Microsoft', model: 'Xbox One', type: 'console'});
			expect(result.os.name).toBe('Windows');
		});

		it('should parse a Nintendo Switch console', () => {
			const result = UaParser.parse(UA.nintendoSwitch);
			expect(result.device).toEqual({vendor: 'Nintendo', model: 'Switch', type: 'console'});
		});

		it('should parse an LG webOS TV', () => {
			const result = UaParser.parse(UA.lgTv);
			expect(result.device).toEqual({vendor: 'LG', model: null, type: 'smarttv'});
			expect(result.os.name).toBe('webOS');
		});

		it('should parse a Samsung Tizen TV', () => {
			const result = UaParser.parse(UA.samsungTv);
			expect(result.device.type).toBe('smarttv');
			expect(result.os).toEqual({name: 'Tizen', version: '6.0'});
		});

		it('should parse a Chromecast', () => {
			const result = UaParser.parse(UA.chromecast);
			expect(result.device).toEqual({vendor: 'Google', model: 'Chromecast', type: 'smarttv'});
			expect(result.cpu.architecture).toBe('arm');
		});

		it('should detect arm64', () => {
			expect(UaParser.parse(UA.macArmHint).cpu.architecture).toBe('arm64');
		});
	});

	describe('section helpers', () => {
		it('should return the same slices parse produces', () => {
			expect(UaParser.browser(UA.chromeWindows)).toEqual(UaParser.parse(UA.chromeWindows).browser);
			expect(UaParser.engine(UA.chromeWindows)).toEqual(UaParser.parse(UA.chromeWindows).engine);
			expect(UaParser.os(UA.chromeWindows)).toEqual(UaParser.parse(UA.chromeWindows).os);
			expect(UaParser.device(UA.safariIphone)).toEqual(UaParser.parse(UA.safariIphone).device);
			expect(UaParser.cpu(UA.chromeWindows)).toEqual(UaParser.parse(UA.chromeWindows).cpu);
		});

		it('should tolerate missing input', () => {
			expect(UaParser.browser(null)).toEqual({name: null, version: null, major: null});
			expect(UaParser.device(undefined)).toEqual({vendor: null, model: null, type: null});
		});
	});
});
