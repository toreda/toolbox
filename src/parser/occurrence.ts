import type {ParserEntry} from './entry';

/**
 * Per-key input occurrences in encounter order, produced by a subclass
 * tokenizer and consumed by `ParserCore.complete`. A `null` raw is the
 * flag form (key present with no value) — `true` for booleans, an error
 * for other types. Internal plumbing — not part of the public API.
 *
 * @category Parser
 */
export interface ParserOccurrence {
	entry: ParserEntry;
	raws: Array<string | null>;
}
