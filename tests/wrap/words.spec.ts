import {wrapWords} from '../../src/wrap/words';

const LOREM =
	'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

describe('wrapWords', () => {
	describe('Defaults', () => {
		it('should wrap at 50 columns with a two space indent', () => {
			expect(wrapWords(LOREM)).toBe(
				'  Lorem ipsum dolor sit amet, consectetur adipiscing\n' +
					'  elit, sed do eiusmod tempor incididunt ut labore\n' +
					'  et dolore magna aliqua.'
			);
		});

		it('should trim trailing whitespace by default', () => {
			expect(wrapWords('aaa   bbb', {width: 5})).toBe('  aaa\n  bbb');
		});

		it('should keep the leading indent on the first line while trimming', () => {
			expect(wrapWords('aaa   bbb', {width: 5}).startsWith('  ')).toBe(true);
		});

		it('should never wrap shorter than the default when width is invalid', () => {
			for (const width of [0, -10, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
				expect(wrapWords(LOREM, {width})).toBe(wrapWords(LOREM));
			}
		});
	});

	describe('Width', () => {
		it('should wrap at the requested width', () => {
			expect(wrapWords(LOREM, {width: 20, trim: false})).toBe(
				'  Lorem ipsum dolor \n' +
					'  sit amet, \n' +
					'  consectetur \n' +
					'  adipiscing elit, sed \n' +
					'  do eiusmod tempor \n' +
					'  incididunt ut labore \n' +
					'  et dolore magna \n' +
					'  aliqua.'
			);
		});

		it('should not count the indent toward the width', () => {
			const wide = wrapWords(LOREM, {width: 20, indent: '        '});
			const none = wrapWords(LOREM, {width: 20, indent: ''});

			expect(wide.split('\n').length).toBe(none.split('\n').length);
		});

		it('should wrap every word onto its own line at width 1', () => {
			expect(wrapWords('a b c', {width: 1})).toBe('  a\n  b\n  c');
		});
	});

	describe('Indent', () => {
		it('should apply a custom indent to every line', () => {
			expect(wrapWords('one two three', {width: 5, indent: '>>'})).toBe('>>one\n>>two\n>>three');
		});

		it('should accept an empty indent', () => {
			expect(wrapWords('one two', {width: 5, indent: ''})).toBe('one\ntwo');
		});

		it('should fall back to two spaces when indent is not a string', () => {
			expect(wrapWords('one two', {width: 5, indent: 4 as unknown as string})).toBe('  one\n  two');
		});
	});

	describe('Newline', () => {
		it('should join lines with a custom newline', () => {
			expect(wrapWords('one two three', {width: 5, newline: '\n\n'})).toBe('  one\n\ntwo\n\nthree');
		});

		it('should join with nothing when newline is an empty string', () => {
			// Each wrapped line keeps the break run it matched on, so joining
			// with nothing collapses back to a single unbroken line. Trimming
			// finds no line ends to strip.
			expect(wrapWords('one two three', {width: 5, newline: ''})).toBe('  one two three');
		});

		it('should indent subsequent lines by default', () => {
			expect(wrapWords('one two', {width: 5, indent: '--'})).toBe('--one\n--two');
		});
	});

	describe('Escape', () => {
		it('should run escape on each line', () => {
			const escape = (line: string): string => line.replace(/</g, '&lt;').replace(/>/g, '&gt;');

			expect(wrapWords('<a> <b>', {width: 4, escape})).toBe('  &lt;a&gt;\n  &lt;b&gt;');
		});

		it('should not run escape on the indent or newline', () => {
			const escape = jest.fn((line: string) => line.toUpperCase());

			expect(wrapWords('one two', {width: 5, indent: 'ab', newline: '\ncd', escape})).toBe(
				'abONE\ncdTWO'
			);
			expect(escape).toHaveBeenCalledTimes(2);
		});

		it('should ignore a non-function escape', () => {
			expect(wrapWords('one two', {width: 5, escape: 'nope' as unknown as () => string})).toBe(
				'  one\n  two'
			);
		});
	});

	describe('Trim', () => {
		it('should keep trailing whitespace when trim is false', () => {
			expect(wrapWords('aaa   bbb', {width: 5, trim: false})).toBe('  aaa   \n  bbb');
		});

		it('should trim trailing tabs as well as spaces', () => {
			expect(wrapWords('aaa\t\t\tbbb', {width: 5})).toBe('  aaa\n  bbb');
		});

		it('should trim a line consisting only of whitespace to empty', () => {
			expect(wrapWords('     ', {width: 10})).toBe('');
		});
	});

	describe('Cut', () => {
		it('should let a long word overflow the line by default', () => {
			expect(wrapWords('supercalifragilisticexpialidocious and more', {width: 10})).toBe(
				'  supercalifragilisticexpialidocious\n  and more'
			);
		});

		it('should break a long word at the width when cut is set', () => {
			expect(
				wrapWords('supercalifragilisticexpialidocious and more', {width: 10, cut: true})
			).toBe('  supercalif\n  ragilistic\n  expialidoc\n  ious and m\n  ore');
		});
	});

	describe('Existing Line Breaks', () => {
		it('should preserve hard breaks from the input', () => {
			expect(wrapWords('one two\nthree four', {width: 20})).toBe('  one two\n  three four');
		});

		it('should not double a break when the input already ends a line', () => {
			expect(wrapWords('one\ntwo', {width: 50})).toBe('  one\n  two');
		});
	});

	describe('Zero Width Space', () => {
		it('should treat a zero width space as a break opportunity', () => {
			expect(wrapWords('aaaa​bbbb', {width: 4})).toBe('  aaaa​\n  bbbb');
		});
	});

	describe('Edge Cases', () => {
		it('should return an empty string for empty input', () => {
			// The indent is the whole result, and trimming strips it like any
			// other whitespace-only line.
			expect(wrapWords('', {width: 10})).toBe('');
		});

		it('should return the indent alone for empty input when trim is false', () => {
			expect(wrapWords('', {width: 10, trim: false})).toBe('  ');
		});

		it('should return content shorter than the width unchanged apart from the indent', () => {
			expect(wrapWords('short', {width: 50})).toBe('  short');
		});

		it('should count astral characters as two code units', () => {
			// Three emoji at two code units each fill a width of 6 exactly.
			expect(wrapWords('🙂🙂🙂 🙂🙂🙂', {width: 6})).toBe('  🙂🙂🙂\n  🙂🙂🙂');
		});

		it('should throw when str is not a string', () => {
			for (const value of [null, undefined, 10, {}, []]) {
				expect(() => {
					wrapWords(value as unknown as string);
				}).toThrow('wrap_words_failure:str:not_a_string');
			}
		});
	});
});
