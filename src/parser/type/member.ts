import type {ParserTypeId} from './id';

/**
 * One member of a parsed option type union. `'string | posInt[]'` produces
 * two members: `{typeId: 'string', array: false}` and
 * `{typeId: 'posInt', array: true}`. The literal `null` member is not
 * represented here — it's folded into `ParserTypeInfo.nullOk`.
 *
 * @category Parser
 */
export interface ParserTypeMember {
	typeId: ParserTypeId;
	/** Member had the `[]` suffix and matches repeated values. */
	array: boolean;
}
