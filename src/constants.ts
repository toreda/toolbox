export class Constants {
	/**
	 * Entropy floor (bits) for the uncoordinated uniqueness guarantee. Derived
	 * short id lengths are the minimum length meeting this floor for the selected
	 * alphabet. See `_specs/uuid-generation-main.md` for the sizing model.
	 */
	public static readonly UUID_FLOOR_BITS = 96;
}
