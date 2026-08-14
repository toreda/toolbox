# Spec Conventions

- Each spec file group uses a single `{domain}-{feature}-main.md` file that acts as the domain & feature combination root for discoverability.
- Iterating over all `*.md` files in `_specs` should discover the entire spec tree, with only a few exceptions (e.g. investigations or specific specs excluded from the main tree).
- Each "main" spec file points at files in the `{domain}/{featureGroup}/{featureName}.md` sub file path:
  - `{domain}` is the project scope, e.g. `api`, `client`, or `server`.
  - `{featureGroup}` is the specific feature group the spec lives in, and may contain one or more subgroups.
  - `{featureName}` is the specific feature.
  - Example: `client/map/generation.md` → domain `client`, feature group `map`, feature name `generation`.
- Multiple nested feature groups unfold naturally in order, e.g. `planet/territory/claims.md` defines a `claims` featue rin the `planet/territory` feature group.

## File Structure & Naming

- Directives applying to file names & file structure live here: `<root>/_directives/project-file-structure-and-naming.md`. Ignore them until the current session needs to create, rename, or move project files.


# Project Goals
* Common self-contained utilities.

# High-level Code Rules
* No dependencies. Most of the systems in this repo simple and should not require any external NPM packages. 
* Write code & systems that can safely run in `WebWorker`, `Node`, and `Browser` environments.