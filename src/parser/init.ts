import type {ParserSchema} from './schema';

/**
 * Constructor init shared by every `ParserCore` subclass.
 *
 * @category Parser
 */
export interface ParserInit<ArgsT> {
	/** Option schema. Validated eagerly — schema errors fail `parse`. */
	schema: ParserSchema<ArgsT>;
	/**
	 * When `true`, input keys not present in the schema are ignored. When
	 * `false` (the default), unknown keys fail parsing with an error naming
	 * the key.
	 */
	allowUnknown?: boolean;
}
