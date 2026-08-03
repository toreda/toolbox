import type {ParserInit} from '../../parser/init';

/**
 * Constructor init for `QueryParser`. Identical shape to the shared
 * `ParserInit` — for query strings, `allowUnknown` is what lets tracking
 * params (`utm_source` & friends) pass through without failing the parse.
 *
 * @category Query
 */
export type QueryParserInit<ArgsT> = ParserInit<ArgsT>;
