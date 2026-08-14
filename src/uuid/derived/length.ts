import { Constants } from "../../constants";


/**
 * Shortest length whose total entropy meets the floor for an alphabet:
 * `ceil(UUID_FLOOR_BITS / log2(alphabetSize))`.
 *
 * @remarks
 * Used by `Uuid` class to derive id length vs min required bits.
 */
export function uuidDerivedLength(alphabetSize: number): number {
	return Math.ceil(Constants.UUID_FLOOR_BITS / Math.log2(alphabetSize));
}
