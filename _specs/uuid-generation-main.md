# Uuid — Main Spec

Root spec for the `uuid` domain, `generation` feature. Self-contained unique id
generation, replacing the external `uuid`, `shortid`, and `base-x` packages for
consumers of this package. Primary implementation file is
[`src/uuid.ts`](../src/uuid.ts) (class `Uuid` plus shared instance `uuid`), with
alphabet presets in [`src/uuid/alphabets.ts`](../src/uuid/alphabets.ts).

> **This document is authoritative.** Any uuid functionality that functionally
> diverges from this spec is incorrect and out of spec — the code is wrong, not
> the spec, unless the spec is deliberately revised. If the source files
> fundamentally change shape or function, this spec must be updated in the same
> change.

Naming note: "uuid" is used here as the umbrella name for all generated ids,
even though a canonical UUID implies the fixed 36-char GUID form. Internally a
single factory produces every id style; externally, callers pick a style by
calling the matching public helper.

## Top-Level Goals

1. **Zero runtime dependencies.** The only platform requirement is
   `globalThis.crypto.getRandomValues`, available in every supported runtime
   (Node ≥ 19, all modern browsers). No third-party packages, no per-runtime
   code paths, no async.
2. **Private factory, public contract.** One private factory method supports
   every id style via flexible, non-opinionated arguments. It is not reachable
   from outside the class. The public surface is a small set of helpers
   (`guid`, `short`) that call the factory with preset arguments and return
   only the output — neither the factory nor its argument contract is exposed.
   The public contract exists to make a uniqueness-violating id
   **unconstructible by a caller**, not merely documented against.
3. **Frozen API.** The public helper set is deliberately minimal and treated as
   frozen once shipped. New id styles are added as new public helpers calling
   the private factory — the factory's flexibility is the extension point, the
   public surface stays opinionated and safe.
4. **Cryptographically sound.** All randomness comes from the platform CSPRNG.
   Short-id characters are selected with unbiased rejection sampling (mask +
   re-draw), never plain modulo, so no alphabet character is statistically
   favored. There is no `Math.random` fallback — ids feed session, JWT, and
   secret paths.
5. **Uncoordinated uniqueness.** See [Uniqueness Contract](#uniqueness-contract).
   Every module generates its own ids with zero coordination; uniqueness is a
   probabilistic guarantee carried entirely by entropy bits.

## Uniqueness Contract

Random ids exist so that any callsite can mint an id with **no coordination**
and rely on it being unique. The guarantee is statistical, and the *only*
property that matters for it is entropy bits. Length is a derived artifact of
`bits ÷ log2(alphabet size)` — no callsite may attach meaning to a specific
length beyond optionally checking that generation produced the expected shape.

Sizing model (birthday bound, `p ≈ n² / 2^(bits+1)`): sustained uncoordinated
generation of **tens of thousands of ids per minute** (~5 × 10⁹/year) held for
years must keep lifetime collision probability negligible (≤ ~10⁻⁹). That
requires **≥ 96 bits** of entropy — the **entropy floor** (`UUID_FLOOR_BITS`,
a named module constant).

### Short ids are a storage optimization, not a different kind of id

The short style exists to spend as few characters as possible while still
meeting the entropy floor. Id columns compound: a primary key's length is paid
again by every foreign key reference and every index over those columns, and
again in every transfer payload carrying the id. The canonical GUID form is a
poor encoding for this — 36 chars for 122 usable bits (hex + dashes + fixed
version/variant bits). A dense alphabet carries the same guarantee in less
than half the space.

**Short length is derived, not chosen:** the shortest length whose entropy
meets the floor for the selected alphabet —
`length = ceil(UUID_FLOOR_BITS / log2(alphabetSize))`.

| Form | Entropy | Meets contract |
|---|---|---|
| GUID (v4), 36 chars | 122 bits | Yes — but space-inefficient |
| base62 @ derived 17 chars | ≈ 101 bits | Yes — **default short form** |
| base64url @ derived 16 chars | 96 bits | Yes — densest URL-safe form |
| base58 @ derived 17 chars | ≈ 100 bits | Yes |
| base62 @ 12 chars | ≈ 71 bits | **No** — collision-prone at contract rates |

### Exactly two id forms

Every id is one of two bit-size buckets, and there is no valid third case:

- **short** — maximum space savings: the minimum length that satisfies the
  entropy floor.
- **normal** (GUID) — space doesn't matter: the canonical 122-bit form.

An intermediate length is never correct. Longer than derived-short buys
entropy nothing needs; shorter than a GUID while longer than derived-short is
the worst of both worlds — not minimal, and not the canonical don't-care form.
This is why the public surface exposes no length argument at all: the two
buckets are fully determined by `UUID_FLOOR_BITS`, the alphabet, and RFC 4122.
Arbitrary lengths exist only as private factory arguments.

Consequences:

- Every public helper satisfies the contract by construction. There is no
  public input that produces a sub-floor or intermediate-length id.
- Sub-floor values (debug/log tags, human-facing codes with their own
  collision handling) are **labels, not ids**. If a label helper is ever
  needed, it is added as a new public helper with a name that says so (e.g.
  `label`) — the private factory already supports it; no id helper gains a
  length argument.
- Systems that share a lookup table use an autoincrementing value from that
  system — coordinated/sequential ids are outside this spec (see Non-Goals).

## Non-Goals

- UUID versions other than v4 (no v1/v3/v5 namespaces or MAC/time inputs). v7
  may be added later as a helper if time-ordered DB keys are ever needed.
- Uniqueness registries, collision checking, or id parsing/validation. This
  module only generates. Length checks on generated ids are permitted only to
  validate that generation produced the expected shape, never as a semantic
  property.
- Coordinated or sequential ids. Systems sharing a lookup table use that
  system's autoincrementing key; this module only produces uncoordinated
  random ids.
- Namespaces. A class is used **by explicit decision**: TypeScript namespaces
  have repeatedly caused compile failures in this project hierarchy. Do not
  refactor `Uuid` into a namespace or namespace-object.
- Static-only shape. `Uuid` is a normal instance class **by explicit
  decision**, so the factory can be a genuinely private member; do not
  refactor the helpers into static methods with the factory exposed alongside.

## Architecture

| Item | File | Responsibility |
|---|---|---|
| `Uuid` | [`src/uuid.ts`](../src/uuid.ts) | Instance class. Private factory + public helpers. Stateless; instances are trivially cheap. |
| `uuid` | [`src/uuid.ts`](../src/uuid.ts) | Shared instance (`export const uuid = new Uuid()`), same-name-helper exception. The normal way call sites consume the class. |
| `uuidAlphabets` | [`src/uuid/alphabets.ts`](../src/uuid/alphabets.ts) | Named alphabet preset constants (`as const`). `UuidAlphabetId` derives from its keys. |
| `uuidDerivedLength` | [`src/uuid/derived/length.ts`](../src/uuid/derived/length.ts) | The `ceil(UUID_FLOOR_BITS / log2(alphabetSize))` derivation, isolated so the sizing rule has one home. |
| `uuidRng` | [`src/uuid/rng.ts`](../src/uuid/rng.ts) | Resolves `globalThis.crypto`, throwing `uuid_failure:crypto_get_random_values:unavailable` when absent. |
| `Constants.UUID_FLOOR_BITS` | [`src/constants.ts`](../src/constants.ts) | The 96-bit entropy floor. Changing it re-derives every short length. |

```
callers ──> uuid.guid() / uuid.short(alphabet?)     (public helpers — the safe contract)
                     │
                     └──> private factory (style, length, alphabet, prefix)
                                  │
                                  └──> crypto.getRandomValues
```

## API

### Public helpers

The helpers are the entire external surface. Each states intent, calls the
private factory with preset arguments, and returns the output string.

```ts
uuid.guid(): string
// Canonical RFC 4122 v4 GUID: 36 chars, lowercase hex, dashed,
// xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx. The "normal" bucket.

uuid.short(alphabet?: UuidAlphabetId): string
// The "short" bucket: derived length for the selected alphabet
// (default 'base62' → 17 chars). No length argument exists.
```

Unknown/invalid `alphabet` values fall back to `base62` — helpers sanitize
their own public arguments; the factory trusts its (internal) callers.

### Private factory

A single private method on `Uuid` generates every style. It is flexible and
non-opinionated: style (`guid`/`short`), arbitrary `length`, preset or custom
`alphabet`, optional `prefix` prepended verbatim (not counted toward
`length`). `length` and `alphabet` apply to the `short` style only — the GUID
form is fixed by RFC 4122 and ignores both; `prefix` applies to either. Its argument interface is declared in `uuid.ts` and **not
exported** — it is an implementation contract between the helpers and the
factory, invisible to callers. Contract enforcement lives entirely in the
helpers; the factory does exactly what it is told.

### Alphabet presets (`uuidAlphabets`)

| Id | Characters | Derived length | Use |
|---|---|---|---|
| `base62` | `0-9 a-z A-Z` | 17 (≈ 101 bits) | **Default.** URL-safe, no separators — safe inside dash/underscore-delimited composite ids. |
| `base58` | base62 minus `0 O I l` | 17 (≈ 100 bits) | Human-transcribable codes (join codes, support references). |
| `base64url` | base62 plus `-` `_` | 16 (96 bits) | Densest URL-safe form — minimum storage; matches legacy `shortid` output range. |

Custom alphabet strings are a factory-level capability (2–256 unique
single-code-unit characters, derived length formula applies); no current
public helper accepts one. Alphabets smaller than 2 characters throw
`uuid_failure:alphabet:too_small` — below that the mask derivation degenerates
and the draw loop cannot terminate.

### Construction

`Uuid` holds no instance state — scratch byte buffers, the hex lookup table,
and alphabet tables live at module scope and are shared. Call sites import the
shared `uuid` instance; constructing additional instances is valid (tests,
injection) and costs nothing meaningful.

## Behavior & Invariants

- **Sync, no throw on bad public arguments.** Helpers are called from
  constructors and must return a string synchronously. Invalid public
  arguments fall back to defaults (unknown alphabet id → `base62`) rather
  than throwing.
- **Throw only on missing CSPRNG or a degenerate alphabet.** If
  `globalThis.crypto.getRandomValues` is unavailable, generation throws
  immediately — a fail-fast condition on an unsupported runtime, never a silent
  degrade to weak randomness. A sub-2-character alphabet likewise throws, but is
  unreachable from the public helpers. Neither is a bad-public-argument path.
- **Unbiased sampling.** Short ids draw random bytes, mask down to the
  smallest power-of-two ≥ alphabet size, and discard out-of-range draws.
  `byte % size` is forbidden.
- **v4 bit correctness.** GUIDs set the version nibble (`0x40`) on byte 6 and
  the RFC variant bits (`0b10` high bits) on byte 8. Output is lowercase hex
  via a precomputed byte→hex lookup table.
- **Allocation discipline.** Shared module-scope buffers/tables; per-call
  allocation is limited to the returned string. Id generation is a
  construction-time operation — it must still never be placed inside a
  per-frame `onUpdate` path.
- **Public surface satisfies the contract by construction.** Every public
  helper's output meets the [Uniqueness Contract](#uniqueness-contract)
  (`guid` at 122 bits; `short` at derived length ≥ `UUID_FLOOR_BITS` for any
  selectable alphabet). No sequence of public calls can yield a weaker id.

## Testing

Spec file at [`tests/uuid.spec.ts`](../tests/uuid.spec.ts). All
testing goes through the public helpers — the private factory is not tested
directly. Required coverage beyond the basics:

- GUID shape: length 36, dash positions, version nibble `4`, variant char in
  `[89ab]`, lowercase.
- Short ids: derived length exactly matches
  `ceil(UUID_FLOOR_BITS / log2(alphabetSize))` for every preset alphabet —
  meets the floor and is never one char longer than required; every output
  char ∈ selected alphabet.
- Public argument sanitization: unknown/invalid alphabet ids produce the
  `base62` default, never a throw.
- Distribution sanity: over a large sample (~100k chars), no alphabet
  character's frequency deviates wildly from uniform (loose bound — catches a
  reintroduced modulo bias, not a statistical test suite).
- Contract lock: the public type surface exposes no length parameter
  (compile-time property; assert helper arities where practical).
- Shared instance: `uuid` is exported, is an instance of `Uuid`, and fresh
  instances produce equivalent output shapes.
- Entropy floor pin: the test's local floor constant matches
  `Constants.UUID_FLOOR_BITS`, so a constant change fails loudly instead of
  letting the derived-length assertions silently agree with themselves.
- Rejection sampling: a non-power-of-two alphabet (`base58`, ~9% of masked
  draws out of range) emits only in-alphabet characters, and the
  power-of-two case (`base64url`) fills with no rejection at all.
- CSPRNG absence: with `globalThis.crypto` stubbed out both helpers throw, and
  the stub is fully restored afterward.

## Migration (for consuming projects)

Guidance for projects adopting this package in place of external id libraries.
Mechanical swap, no behavior coupling — ids are generated fresh, never parsed:

1. Replace `shortid()` / `shortid.generate()` call sites with `uuid.short()`,
   and `uuidv4()` call sites with `uuid.guid()`.
2. Replace `uuid` → base62 re-encoding helpers (typically built on `base-x`)
   with a direct `uuid.short()` call.
3. Remove `uuid`, `shortid`, `base-x`, and their `@types/*` entries from the
   consumer's `package.json`.
4. Pre-switch check: grep for id-shaped format validation (regexes,
   fixed-length checks) before swapping — especially anything touching session
   ids. Fixed-length assumptions are the main breakage risk, since derived
   short lengths differ from `shortid`'s.

Legacy compatibility: old `shortid` ids (base64url, 7–14 chars) and old base62
short codes remain valid stored values; new and old ids coexist. Nothing may
assume a uniform id format across the changeover.
