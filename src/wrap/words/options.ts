/**
 * Options accepted by `wrapWords`. Every property is optional — the defaults
 * reproduce the widely-used `word-wrap` package's output for the same input.
 *
 * @category WrapWords
 */
export interface WrapWordsOptions {
	/**
	 * Maximum line length, in UTF-16 code units, before wrapping to a new
	 * line. Measured against the wrapped content only — `indent` is not
	 * counted toward the width. Non-integer, zero, and negative values fall
	 * back to the default.
	 * @default 50
	 */
	width?: number;
	/**
	 * String placed at the start of every line, including the first. Counts
	 * as leading content rather than width, so a wide indent never shortens
	 * the wrapped text.
	 * @default '  ' (two spaces)
	 */
	indent?: string;
	/**
	 * String joining consecutive lines. The default appends `indent` after
	 * the line break so every line starts flush with the first one; pass an
	 * explicit value (e.g. `'\n\n'`) to control the join yourself, in which
	 * case indenting subsequent lines is left to the caller.
	 * @default '\n' + indent
	 */
	newline?: string;
	/**
	 * Transform applied to each line after splitting and before joining.
	 * Runs on the line's content only — never on `indent` or `newline` — so
	 * escaping (HTML, XML) can't corrupt the layout characters.
	 * @default (line) => line
	 */
	escape?: (line: string) => string;
	/**
	 * Trim trailing spaces and tabs from the end of every line. Distinct
	 * from `String.prototype.trim`, which would also strip the leading
	 * indent from the first line.
	 * @default true
	 */
	trim?: boolean;
	/**
	 * Break words longer than `width` at an arbitrary character instead of
	 * letting them overflow the line.
	 * @default false
	 */
	cut?: boolean;
}
