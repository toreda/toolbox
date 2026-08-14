import type {WrapWordsOptions} from './words/options';

/**
 * Zero-width space. Treated as a break opportunity alongside standard
 * whitespace so callers can mark split points inside otherwise unbreakable
 * runs (URLs, identifiers) without inserting a visible character.
 */
const ZWSP = '​';

/** Break characters, as a character-class body for the wrap pattern. */
const BREAK_CLASS = `\\s${ZWSP}`;

const DEFAULT_WIDTH = 50;
const DEFAULT_INDENT = '  ';

/**
 * Strip trailing spaces and tabs from every line. Only spaces and tabs are
 * removed — line breaks are structural here and must survive, which rules
 * out `String.prototype.trimEnd` on the joined result.
 */
function trimLineEnds(str: string): string {
	const lines = str.split('\n');

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		let end = line.length;

		while (end > 0) {
			const ch = line[end - 1];

			if (ch !== ' ' && ch !== '\t') {
				break;
			}

			end--;
		}

		lines[i] = line.substring(0, end);
	}

	return lines.join('\n');
}

/**
 * Wrap text to a maximum line width, breaking on whitespace so words stay
 * intact. Output matches the `word-wrap` package for the same input and
 * options, minus its quirks: non-string input throws instead of being
 * returned unchanged, invalid widths fall back to the default instead of
 * producing a broken pattern, and `trim` defaults to `true` (the package
 * documents `true` in its typings but implements `false`).
 *
 * Wrapping is a soft operation. A word longer than `width` overflows its
 * line rather than being split, unless `cut` is set — so a line can exceed
 * `width` but content is never silently lost.
 *
 * Line breaks already present in the input are preserved: they act as
 * break characters, so text after one starts a new line regardless of how
 * much room was left on the previous one.
 *
 * @param str		Text to wrap. Measured in UTF-16 code units, so astral
 * 					characters (emoji) count as two toward `width`.
 * @param options	Wrapping behavior. See `WrapWordsOptions` for defaults.
 * @returns			Wrapped text, indented and joined by `newline`.
 * @throws			`TypeError` when `str` is not a string.
 *
 * @category WrapWords
 */
export function wrapWords(str: string, options?: WrapWordsOptions): string {
	if (typeof str !== 'string') {
		throw new TypeError('wrap_words_failure:str:not_a_string');
	}

	// A fractional or non-positive width makes the quantifier below either
	// invalid or unsatisfiable, so anything but a positive integer resolves
	// to the default rather than failing at match time.
	const requested = options?.width;
	const width =
		typeof requested === 'number' && Number.isInteger(requested) && requested > 0
			? requested
			: DEFAULT_WIDTH;

	const indent = typeof options?.indent === 'string' ? options.indent : DEFAULT_INDENT;
	// Empty string is a meaningful newline (join with nothing), so only an
	// absent or non-string value falls back to the indent-aware default.
	const newline = typeof options?.newline === 'string' ? options.newline : `\n${indent}`;
	const escape = typeof options?.escape === 'function' ? options.escape : undefined;
	const trim = options?.trim !== false;

	// `.` never matches '\n', so an input line break always terminates the
	// current match and starts a new line — that's how hard breaks survive.
	//
	// Without `cut`, each alternative must end at a break run (or the end of
	// input) so words are never split mid-match; the lazy second alternative
	// is the overflow path for a single word wider than `width`. With `cut`,
	// the bare quantifier alone takes every `width` code units as they come.
	const pattern = options?.cut === true
		? `.{1,${width}}`
		: `.{1,${width}}([${BREAK_CLASS}]+|$)|[^${BREAK_CLASS}]+?([${BREAK_CLASS}]+|$)`;

	// `null` here means the input held nothing matchable (only ''), leaving
	// the indent as the entire result — which `trim` then still applies to.
	const matched = str.match(new RegExp(pattern, 'g')) ?? [];
	const lines: string[] = [];

	for (const match of matched) {
		// A match ending in '\n' consumed the input's own break as part of
		// its trailing break run. Dropping it prevents a doubled line break
		// once `newline` is joined on.
		const line = match.endsWith('\n') ? match.substring(0, match.length - 1) : match;

		lines.push(escape !== undefined ? escape(line) : line);
	}

	const result = indent + lines.join(newline);

	return trim ? trimLineEnds(result) : result;
}
