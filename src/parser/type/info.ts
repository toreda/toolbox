import {type ParserTypeId, parserTypeIds} from './id';
import type {ParserTypeMember} from './member';

/**
 * Parsed form of an option's `type` string. Produced once per option by
 * `parserTypeInfo` so value conversion & error messages don't re-parse the
 * type string on every argument.
 *
 * @category Parser
 */
export interface ParserTypeInfo {
	/** Original type string as written in the schema. */
	raw: string;
	/** Non-null union members in declared order. */
	members: ParserTypeMember[];
	/** Union includes `null` — the literal value `null` matches. */
	nullOk: boolean;
	/** At least one member is an array type. */
	arrayOk: boolean;
	/** At least one member is a non-array type. */
	singleOk: boolean;
}

/**
 * Parse an option type string (e.g. `'string'`, `'posInt[]'`,
 * `'string | string[] | null'`) into a `ParserTypeInfo`. Returns `null` when
 * the string is not a valid type:
 * - unknown base type id
 * - empty union member (`'string |'`)
 * - `null[]` (null is a literal, not an element type)
 * - `null` as the only member (null never stands alone)
 *
 * Duplicate members are collapsed. Members keep declared order, which is
 * also the order conversion attempts them.
 *
 * @category Parser
 */
export function parserTypeInfo(type?: string | null): ParserTypeInfo | null {
	if (typeof type !== 'string') {
		return null;
	}

	const parts = type.split('|').map((part) => part.trim());
	const members: ParserTypeMember[] = [];
	let nullOk = false;

	for (const part of parts) {
		if (!part) {
			return null;
		}

		const array = part.endsWith('[]');
		const base = array ? part.slice(0, -2).trim() : part;

		if (base === 'null') {
			if (array) {
				return null;
			}

			nullOk = true;
			continue;
		}

		if (!parserTypeIds.includes(base as ParserTypeId)) {
			return null;
		}

		if (members.some((member) => member.typeId === base && member.array === array)) {
			continue;
		}

		members.push({typeId: base as ParserTypeId, array: array});
	}

	if (!members.length) {
		return null;
	}

	return {
		raw: type,
		members: members,
		nullOk: nullOk,
		arrayOk: members.some((member) => member.array),
		singleOk: members.some((member) => !member.array)
	};
}
