/**
 * Result of scanning a byte buffer for UTF-8 validity via `utf8Scan`.
 *
 * @category Utf8
 */
export interface Utf8ScanResult {
	/** Whether the entire buffer is well-formed UTF-8. */
	valid: boolean;
	/**
	 * Byte offset of the first byte of the first invalid sequence, or `-1`
	 * when the buffer is valid. For a sequence truncated by the end of the
	 * buffer, this is the offset of the truncated sequence's lead byte.
	 */
	invalidAt: number;
	/**
	 * Number of complete code points decoded before the scan ended — the
	 * total count when valid, the count preceding `invalidAt` otherwise.
	 */
	codePoints: number;
}
