# `cyrb53` Hash — Main Spec

Root spec for the `hash` domain, `cyrb53` feature. Fast, deterministic 53-bit
string hash used for identity signatures when cryptographic security is not
needed. Runs in `WebWorker`, `Browser`, and `Node` without polyfills or
external dependencies because it doesn't require SSL libraries — the only
platform requirements are `Math.imul` and `String.prototype.charCodeAt`.

> **This document is authoritative.** Any cyrb53 functionality that
> functionally diverges from this spec is incorrect and out of spec — the code
> is wrong, not the spec, unless the spec is deliberately revised. If the
> source file fundamentally changes shape or function, this spec must be
> updated in the same change.

Provenance: public-domain algorithm by bryc
(<https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js>),
vendored verbatim in behavior.

## Scope & Files

| Role | File |
| --- | --- |
| Implementation | `src/cyrb53.ts` (`cyrb53`) |
| Tests | `tests/cyrb53.spec.ts` |
| Public exports | `src/index.ts` (`cyrb53`) |

## Top-Level Goals

1. **Zero dependencies, zero setup.** A single pure function — no key import,
   no crypto initialization, no async, no per-runtime code paths.
2. **Deterministic across runtimes and sessions.** The same `(str, seed)` pair
   produces the same hash in every supported environment, in every session,
   forever. Outputs are persistable.
3. **Explicitly non-cryptographic.** See [Security Posture](#security-posture).

## Security Posture

- **NOT CRYPTOGRAPHICALLY SECURE.**
- **NOT A REPLACEMENT FOR CRYPTOGRAPHICALLY SECURE ALGORITHMS LIKE `RSA` AND
  `SHA`.**
- Must never be used for key signing or verification, password hashing,
  security tokens, or any input an attacker controls where collisions have a
  security consequence. Valid uses are strictly non-secure identity
  signatures: content hashes, cache keys, change detection, bucketing.

## API

```ts
cyrb53(str: string, seed?: number): number  // seed defaults to 0
```

- `str` — value to hash, processed **per UTF-16 code unit** (`charCodeAt`).
  Surrogate pairs are consumed as their two constituent code units; no Unicode
  normalization or encoding conversion is performed. Callers hashing objects
  must produce their own deterministic string first — stringification is out
  of scope.
- `seed` — optional namespace so identical strings hashed for different
  purposes don't collide by construction. Coerced to a 32-bit integer (ToInt32)
  before mixing: fractional seeds truncate (`1.7` ≡ `1`), values ≥ 2³² wrap
  (`2 ** 32 + 5` ≡ `5`), and negative seeds are valid and deterministic.
  Omitting the seed is exactly `seed = 0`.
- Returns an **unsigned safe integer in `[0, 2^53)`** — always passes
  `Number.isSafeInteger`, never negative. Safe to persist, JSON-serialize, and
  compare with `===`.
- **Never throws** for string input, including the empty string and long
  inputs. Non-string input is a caller bug (TypeScript-enforced); no runtime
  coercion is specified.

## Frozen Output Contract

cyrb53 results are persisted as identity signatures (content hashes, scene
versions). **The algorithm is frozen**: any change that alters the output for
any `(str, seed)` pair silently invalidates every stored hash and is a
breaking change requiring a migration plan for persisted values — it is never
a routine refactor.

The known vectors below (locked by tests) pin the implementation. They must
not be updated to match new code; code must be fixed to match them.

| Input | Seed | Hash |
| --- | --- | --- |
| `''` | 0 | `3338908027751811` |
| `'a'` | 0 | `7929297801672961` |
| `'b'` | 0 | `8684336938537663` |
| `'abc'` | 0 | `5059922895146125` |
| `'hello world'` | 0 | `3259054761512980` |
| `'a'` | 1 | `5368154436228575` |
| `'a'` | 2 | `217965353842102` |
| `'abc'` | 42 | `6035376845117563` |
| `'a'` | −1 | `73693522129417` |
| `'🙂'` | 0 | `5813621503378343` |
| `'x'.repeat(1000)` | 0 | `7451676703532859` |

## Behavior & Invariants

- **Pure and stateless.** No module state, no side effects; safe to call
  concurrently from any context.
- **Deterministic.** `(str, seed)` fully determines the output.
- **Seed-sensitive.** The same string hashed with different (post-coercion)
  seeds produces different results.
- **Order-sensitive.** Reordered content hashes differently (`'ab'` ≠ `'ba'`);
  near-identical strings (`'revenge'` / `'revenue'`) hash differently.
- **Collision expectations.** 53 output bits give a birthday bound of
  `p ≈ n² / 2^54`: negligible for thousands of hashed values (~10⁻⁸ at 1k,
  ~10⁻² at 10M), with 50% collision odds near ~1.1 × 10⁸ values. Callers whose
  correctness breaks on a collision at those scales need a wider hash, not
  this one.
- **Linear cost.** One pass over the string; no allocation beyond locals.
  Suitable for hot paths, but hashing very large strings per-frame is a caller
  design smell.

## Non-Goals

- Cryptographic properties of any kind (preimage or collision resistance,
  unpredictability).
- Collision-free operation — 53 bits is a statistical guarantee only (see
  collision expectations above).
- Streaming/incremental hashing. The input is a complete string; there is no
  update/digest API.
- Hashing non-string values. Object/number/binary stringification is the
  caller's responsibility and out of scope.
- Alternate output encodings (hex, base62). The output is a number; encoding
  is the caller's concern.

## Testing

Spec file at `tests/cyrb53.spec.ts`. Required coverage:

- **Known-vector lock**: every vector in
  [Frozen Output Contract](#frozen-output-contract), including empty string,
  surrogate-pair content, non-zero and negative seeds, and a long (1000+ char)
  input. The test file must carry a comment warning that these values lock
  persisted hashes and must not be updated without a migration plan.
- **Determinism**: repeated calls with identical `(str, seed)` are identical;
  the default seed behaves exactly as `seed = 0`.
- **Distribution smoke**: similar strings, different seeds, and reordered
  content each produce different hashes (sanity checks, not statistical
  tests).
- **Seed coercion**: fractional truncation, ≥ 2³² wrapping, and negative-seed
  determinism.
- **Output range**: across representative samples, results are non-negative
  safe integers below 2⁵³.
