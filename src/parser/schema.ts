import type {ParserOption} from './option';

/**
 * Full option schema for a `ParserCore` subclass. Maps each property of the
 * parsed result type `ArgsT` to its option config, so the schema can't
 * silently omit or misspell a key of the result type. Schema keys must be
 * alpha-numeric and are matched case-insensitively against input keys.
 *
 * One schema can drive both a `CliParser` and a `QueryParser` — the value
 * grammar is identical, only the input format differs.
 *
 * @category Parser
 */
export type ParserSchema<ArgsT> = {
	[K in keyof ArgsT]-?: ParserOption<ArgsT[K]>;
};
