# URL Parser — Casing Rules

Domain `url`, feature group `parser`, feature `casing`. Part of [url-parser-main.md](../../url-parser-main.md); the authority note there applies here.

Defines exactly which result parts are case-folded and which must be preserved as written. Getting this split wrong is a functional defect, not a style issue.

## Lowercased Parts

These are case-insensitive by nature and are always returned lowercased, regardless of input casing:

- `scheme`
- `host`
- `subdomain`
- `subdomains` (every element)
- `domain`
- `tld`

## Case-Preserved Parts

These are allowed to be case-sensitive and must be returned exactly as written — never case-folded:

- `username`
- `password`
- `path`
- `query`
- `fragment`
- `url` (the raw input field is always byte-for-byte the input)

## The Userinfo Distinction

The critical subtlety: **userinfo is written adjacent to the hostname** (`UserName:PassWord@Example.COM`) but must not be lowercased with it. The userinfo must be split off the authority *before* any case-folding is applied, so the fold only ever touches the `host[:port]` portion.

This holds in every input form, including scheme-less userinfo (`MixedCase:AlsoMixed@Example.COM`).

## Required Examples

`HTTPS://UserName:PassWord@WWW.Example.COM:8000/Some/Path?Key=Value#Frag` →

| Field | Value | Rule |
| --- | --- | --- |
| `scheme` | `https` | lowercased |
| `username` | `UserName` | preserved |
| `password` | `PassWord` | preserved |
| `host` | `www.example.com` | lowercased |
| `subdomain` | `www` | lowercased |
| `domain` | `example.com` | lowercased |
| `tld` | `com` | lowercased |
| `path` | `/Some/Path` | preserved |
| `query` | `Key=Value` | preserved |
| `fragment` | `Frag` | preserved |
