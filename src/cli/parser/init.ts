import type {ParserInit} from '../../parser/init';

/**
 * Constructor init for `CliParser`. Identical shape to the shared
 * `ParserInit` — for CLI parsing, `allowUnknown` also consumes an unknown
 * key's separate-form value token so it isn't misreported as a stray
 * positional.
 *
 * @category CLI
 */
export type CliParserInit<ArgsT> = ParserInit<ArgsT>;
