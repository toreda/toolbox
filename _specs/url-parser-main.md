# URL Parser — Main Spec

Root spec for the `url` domain, `parser` feature. Defines the required behavior of `UrlParser` and `UrlParserResult`.

> **This document (and its sub-specs) is authoritative.** Any URL parser functionality that functionally diverges from this spec is incorrect and out of spec — the code is wrong, not the spec, unless the spec is deliberately revised. If the parser source files fundamentally change shape or function, this spec must be updated in the same change.

## Scope & Files

| Role | File |
| --- | --- |
| Parser implementation | `src/url/parser.ts` (`UrlParser`) |
| Result type | `src/url/parser/result.ts` (`UrlParserResult`) |
| Tests | `tests/url/parser.spec.ts` |
| Public exports | `src/index.ts` (`UrlParser`, `UrlParserResult`) |

`UrlParser` is a dependency-free namespace object safe in `WebWorker`, `Node`, and `Browser` environments. It replaces the `parse-domain` package's core use case: extracting the domain from a URL that may lack a scheme, path, or other parts.

## Sub-Specs

- [url/parser/parsing.md](url/parser/parsing.md) — input forms, scheme rules (including arbitrary app-bound schemes), authority detection, userinfo, host, port, path, query, fragment.
- [url/parser/domain.md](url/parser/domain.md) — root domain, TLD, current-level subdomain, and the full subdomain chain.
- [url/parser/casing.md](url/parser/casing.md) — which parts are lowercased and which must preserve case exactly.

## Core Contract

- `UrlParser.parse(url)` **never throws**. Non-string input (`null`, `undefined`, numbers, …) parses as empty input.
- Input is trimmed of surrounding whitespace before parsing; the `url` result field holds the **raw, untrimmed** input (`''` when input was not a string).
- Every `UrlParserResult` field is always present — parts the input doesn't contain are `null` (never omitted), except `subdomains`, which is always an array (`[]` when none). Results are safe to destructure without existence checks.
- Nothing is percent-decoded. All parts are returned as written in the input, modulo the casing rules in [url/parser/casing.md](url/parser/casing.md).
- The `query` field is returned in exactly the form `QueryParser.parse` accepts (no leading `?`), so the two parsers compose.
- Per-part helpers `UrlParser.scheme(url)`, `.host(url)`, `.domain(url)`, `.query(url)` must return exactly the same value as that field of `UrlParser.parse(url)`.

## Result Fields

| Field | Meaning | Absent value |
| --- | --- | --- |
| `url` | Raw input as given | `''` |
| `scheme` | Lowercased scheme, no trailing `:` | `null` |
| `username` | Userinfo before first `:`, case preserved | `null` |
| `password` | Userinfo after first `:`, case preserved | `null` |
| `host` | Full lowercased hostname, no port, IPv6 without brackets | `null` |
| `port` | Numeric port 0–65535 | `null` |
| `path` | Path as written, leading `/` kept when present | `null` |
| `query` | Query without leading `?` | `null` (`''` for a bare trailing `?`) |
| `fragment` | Fragment without leading `#` | `null` |
| `subdomain` | Current-level (leftmost) subdomain label only | `null` |
| `subdomains` | All subdomain labels, current level first | `[]` |
| `domain` | Root (registrable) domain — always the `example.com` part | `null` |
| `tld` | Public suffix of `domain` | `null` |

## Reference Example

`HTTPS://UserName:PassWord@One.Two.Three.Example.CO.UK:8443/Some/Path?Key=Value#Frag` must parse to:

```
url:        (the raw input, unchanged)
scheme:     'https'
username:   'UserName'
password:   'PassWord'
host:       'one.two.three.example.co.uk'
port:       8443
path:       '/Some/Path'
query:      'Key=Value'
fragment:   'Frag'
subdomain:  'one'
subdomains: ['one', 'two', 'three']
domain:     'example.co.uk'
tld:        'co.uk'
```
