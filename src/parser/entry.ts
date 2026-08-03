import type {ParserOption} from './option';
import type {ParserTypeInfo} from './type/info';

/**
 * Schema entry resolved at construction: original-cased key, its option
 * config, and the pre-parsed type info. Internal plumbing between
 * `ParserCore` and its subclasses' tokenizers — not part of the public API.
 *
 * @category Parser
 */
export interface ParserEntry {
	key: string;
	option: ParserOption<unknown>;
	info: ParserTypeInfo;
}
