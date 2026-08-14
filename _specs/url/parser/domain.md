# URL Parser — Domain Extraction Rules

Domain `url`, feature group `parser`, feature `domain`. Part of [url-parser-main.md](../../url-parser-main.md); the authority note there applies here.

Defines the `domain`, `tld`, `subdomain`, and `subdomains` result fields — the `parse-domain` replacement functionality.

## When Domain Parts Exist

Domain parts are derived only from a **named host**. All four fields are absent (`null` / `[]`) when the host is:

- absent entirely (path-only input, opaque schemes),
- an IPv4 address (`192.168.1.10`),
- an IPv6 address (any host containing `:`),
- a single label (`localhost`, `intranet`), or
- malformed with empty labels.

The `host` field still carries IPs and single labels; only the domain breakdown is withheld.

## Root Domain (`domain`)

- `domain` is the **root (registrable) domain** — always the `example.com` part regardless of how many subdomain levels sit above it. `one.two.three.example.com` → `example.com`; `www.example.co.uk` → `example.co.uk`.
- It equals `tld` plus exactly one label.

## TLD (`tld`)

- Default: the last host label (`com`, `io`, `uk`).
- **Two-part ccTLD heuristic:** the suffix extends to the last two labels when all of these hold:
  - the host has ≥ 3 labels,
  - the last label is exactly 2 characters (a country code), and
  - the second-to-last label is in the second-level set: `ac`, `co`, `com`, `edu`, `go`, `gob`, `gouv`, `gov`, `mil`, `ne`, `net`, `nom`, `or`, `org`, `sch`.
- Examples: `www.example.co.uk` → `co.uk`; `shop.example.com.au` → `com.au`; `example.co.jp` → `co.jp`; `www.example.gov.br` → `gov.br`.
- This is deliberately a **heuristic**, not the full public suffix list (which is far too large for a dependency-free utility). Exotic PSL entries not matching the pattern above resolve as a plain single-label TLD; that is in-spec behavior, not a defect.
- A two-label host is never split by the heuristic: `example.io` → domain `example.io`, tld `io` (the ≥ 3 labels condition prevents eating the whole host).

## Subdomains (`subdomain`, `subdomains`)

- `subdomains` holds **every** label left of `domain`, ordered current level first (leftmost first). `one.two.three.example.com` → `['one', 'two', 'three']`. Empty array when the host has no subdomain.
- `subdomain` is the **current-level subdomain only** — the leftmost label, i.e. `subdomains[0]` — or `null` when there is none. `one.two.three.example.com` → `'one'`; `www.example.com` → `'www'`; `example.com` → `null`.

## Required Examples

| Host | `subdomain` | `subdomains` | `domain` | `tld` |
| --- | --- | --- | --- | --- |
| `example.com` | `null` | `[]` | `example.com` | `com` |
| `www.example.com` | `www` | `['www']` | `example.com` | `com` |
| `inner.www.example.com` | `inner` | `['inner', 'www']` | `example.com` | `com` |
| `deep.inner.www.example.com` | `deep` | `['deep', 'inner', 'www']` | `example.com` | `com` |
| `www.example.co.uk` | `www` | `['www']` | `example.co.uk` | `co.uk` |
| `example.io` | `null` | `[]` | `example.io` | `io` |
| `localhost` | `null` | `[]` | `null` | `null` |
| `192.168.1.10` | `null` | `[]` | `null` | `null` |

These must hold across every combination of scheme (present or absent), port (present or absent), userinfo, path, query, and fragment — the tests cover the scheme × port × subdomain-depth (0–3) permutation matrix explicitly.
