export function uuidRng(): Crypto {
	const rng = globalThis.crypto;

	if (!rng || typeof rng.getRandomValues !== 'function') {
		throw new Error('uuid_failure:crypto_get_random_values:unavailable');
	}

	return rng;
}