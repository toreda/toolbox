# URL Parser — Parsing Rules

Domain `url`, feature group `parser`, feature `parsing`. Part of [url-parser-main.md](../../url-parser-main.md); the authority note there applies here.

Defines how input text splits into scheme, userinfo, host, port, path, query, and fragment.

## Accepted Input Forms

All of these must parse, not just full absolute URLs:

| Form | Example | Notes |
| --- | --- | --- |
| Full URL | `https://user:pass@www.example.com:8000/a?b=1#c` | Every part populated |
| Scheme-less host | `www.example.com/path?q=1` | Main `parse-domain` use case |
| Host + port, no scheme | `example.com:8080/api` | `:digits` is a port, never a scheme |
| Protocol-relative | `//cdn.example.com/lib.js` | Authority form, `scheme: null` |
| Bare host | `example.com`, `localhost`, `localhost:3000` | |
| Userinfo without scheme | `user@www.domain.com`, `user:pass@www.domain.com:8000` | See userinfo rules |
| IP hosts | `http://192.168.1.10:3000/`, `http://[::1]:8080/x` | IPv6 brackets stripped in `host` |
| Opaque scheme | `mailto:someone@example.com` | Remainder is `path`, `host: null` |
| Path only | `/just/a/path`, `plainword` | `host: null`, whole text is `path` |
| Empty / non-string | `''`, `'   '`, `null`, `undefined` | All-null result, `url` as given (`''` for non-strings) |

## Scheme

- **Arbitrary scheme names are supported.** App store URLs bind per-app arbitrary schemes, so there is no allowlist of hierarchical schemes. `myapp://x` and `com.example.app-2+beta://x` are schemes like any other.
- **Character set is strict.** A scheme uses only the standard RFC 3986 scheme characters: letters, digits, `+`, `-`, `.`. A name containing any other character (e.g. `my_app://x`) is never a scheme — the input parses as a path instead.
- **Letter-first is relaxed only before `//`.** RFC 3986 requires a leading letter; app-bound schemes may lead with a digit (`1password://open`). The digit-leading form is accepted only in the unambiguous `name://` shape.
- The scheme is returned lowercased, without the trailing `:`.

### Scheme vs. not-a-scheme disambiguation

A leading `name:` is a scheme **unless** the remainder shows otherwise:

1. **Port lookahead** — digits then a delimiter (`/`, `?`, `#`, or end) after the `:` is `host:port`, not a scheme. `example.com:8080/path` → host `example.com`, port `8080`. `localhost:8080` → host `localhost`.
2. **Userinfo lookahead** — an `@` appearing before the first `/`, `?`, or `#` means the `:` belongs to `user:pass`, not a scheme. `user:pass@www.domain.com` → username `user`, password `pass`. Exception: the known opaque-scheme set below.
3. **Opaque schemes** — these names keep an `@`-bearing payload as an opaque path: `callto`, `data`, `geo`, `javascript`, `magnet`, `mailto`, `news`, `sms`, `tel`, `urn`. `mailto:someone@example.com` → scheme `mailto`, path `someone@example.com`, host `null`.
4. A scheme **not** followed by `//` is opaque: the remainder is `path` (host stays `null`); query and fragment still split off the tail.

## Authority Detection (scheme-less input)

Input with no scheme and no leading `//` starts with an authority only when its first segment (text before the first `/`, `?`, or `#`, with any `userinfo@` prefix ignored) looks host-shaped:

- bracketed IPv6 (`[::1]`), or
- contains a `.` (`www.example.com`, `user@www.domain.com`), or
- is `localhost` in any case, with or without a port.

Otherwise the text is a path: `/abs/path`, `relative/path`, `plainword` all parse with `host: null`. A segment that is empty or starts with `.` is never an authority.

## Userinfo

- The authority splits at the **last** `@`: everything before it is userinfo, after it is `host[:port]`.
- Userinfo splits at the **first** `:`: before it is `username`, after it is `password`.
- Empty components are `null`, not `''`: `user@host` → password `null`; `:secret@host` → username `null`.
- Username and password preserve case exactly — see [casing.md](casing.md). This is a critical distinction: the userinfo is written adjacent to the host, but must never be case-folded with it.

## Host & Port

- The host is lowercased and returned without the port.
- A single trailing dot (FQDN form, `example.com.`) is stripped.
- IPv6 hosts are bracketed in the input and returned **without** brackets (`[::1]` → `::1`); the port follows the closing bracket.
- For non-bracketed hosts, the port splits at the **last** `:`.
- A port is valid only as `:` + decimal digits in 0–65535. Invalid forms (`:abc`, `:99999`, a bare `:`) yield `port: null` while the host keeps the text before the colon.

## Path, Query, Fragment

- The fragment is everything after the first `#` (returned without the `#`); it terminates all other parts.
- The query is everything between the first `?` and the fragment (returned without the `?`).
- A bare trailing `?` yields `query: ''` (present but empty); no `?` at all yields `null`. Same value-shape distinction does not apply to fragments: no `#` → `null`.
- In authority form, the path starts at the first `/` after the authority and keeps its leading `/`. In opaque/relative form, the path is the remaining text as written.
- All three preserve case and encoding exactly as written.
