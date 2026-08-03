* Structure
  * These rules were written for a single-project repo. This repo holds several projects under one repo root, so three roots are defined explicitly and every path below is relative to the right one.
  * `<root>` — the git repo root.
  * `<project_root>` — a single project's own root, a direct child of `<root>`. So `<root>/api` **is** api's `<project_root>`.
  * `<project_src_root>` — the TypeScript source root **inside** a project. This **varies by project**, because each project sits at a different part of the stack and structures its `src` accordingly:
    * **client** → `<root>/client/src/main`
    * **api** → `<root>/api/src`
    * **shard** → `<root>/shard/src`
  * The extra `main` segment appears when a project's `src` also holds **non-TypeScript assets** (e.g. `src/html`, `src/sounds`): TypeScript lives under `src/main`, sibling asset types under `src/<assetType>`. A project with only TypeScript source (api, shard) roots at `src` directly.
  * The export-name tree (below) is always built from `<project_src_root>`.

### One primary export per file

* Each file has exactly one **primary export** — the name the path is generated from. Prefix it with its subsystem word so related files coalesce into one folder (`Mesher` → `VoxelMesher` lands beside `VoxelGrid` under `voxel/`).
* **Exception — same-name helper:** a function whose name is the primary with different casing may share the file (`export interface VoxelRayHit` + `export function voxelRayHit`). No default exports, so there is no collision.
* **Loose sibling helpers** (differently-named functions/constants that belong with the primary) are collapsed into it so the file still has one primary export. The *shape* of that primary depends on whether the module holds state:
  * **Stateful module** → a real `class` (the helpers become methods/static members). Use for anything with instance state or lifecycle (e.g. `ShipBuilder`, `VoxelGrid`, `BuildMode`).
  * **Pure functions / constants** → a single **namespace object**, `export const VoxelCollision = { pointInBlockVolume, raycastBlockVolume, … } as const`. Do **not** force a static-only class onto procedural hot-path code — it adds a prefix to every call for no runtime benefit and disguises pure functions as a class. Bare bit-constants group the same way (`export const VoxelBlocks = { FACE_PX, INTERACT_CORE, DIR_VECS, registry, … } as const`).
  * **Reactive/singleton exports** (e.g. a Vue `reactive()` store) keep their value shape; the primary is that singleton, not a wrapper class.

### How to generate filename

Start with the file’s export (e.g. `export interface TheBigFile`).

* Export name is the basis the filename, e.g. `TheBigFile` in `export interface TheBigFile`.  
* Each case change is a new word.  
  * `theBig` becomes `the big`.  
  * `SomeBigFile` becomes `some big file`.  
  * Roughly equivalent to `string.split(...)`, but using case change instead of a character.  
  * The casing of the first letter is irrelevant.  
    * `theBigFile` and `TheBigFile` both become `the big file`.  
  * Ignore decorators, keywords, language constructs, specifiers, and anything else before export name.  
  * All of the following are reduced to the same result `[‘the’, ‘big’, ‘file’]`:  
    * `export interface TheBigFile`  
    * `export type TheBigFile`  
    * `export class TheBigFile`  
    * `export const theBigFile`  
  * You now have an array of words from file’s export:  
    * `theBigFile` should be `[‘the’, ‘big’, ‘file’]`  
    * Starting in the project’s `<project_src_root>` (e.g. `client/src/main`, `api/src`):  
      * Each word in the array except the last word becomes a directory.  
        * `[‘the’, ‘big’, ‘file’]` \-\> `<project_src_root>/the/big`  
      * The last  word in the array is the filename with \`.ts\` appended.  
        * `[‘the’, ‘big’, ‘file’]` \-\> `<project_src_root>/the/big/file.ts`
      * Client example: `export class ShipBuilderGame` \-\> `[‘ship’, ‘builder’, ‘game’]` \-\> `client/src/main/ship/builder/game.ts`.
  

### Matching Test Files
* The test root mirrors `<project_src_root>` by swapping the leading `src` for `tests`, keeping any suffix. So:
  * **client** → `<root>/client/tests/main` mirrors `<root>/client/src/main`
  * **api** → `<root>/api/tests` mirrors `<root>/api/src`
  * **shard** → `<root>/shard/tests` mirrors `<root>/shard/src`
* Each source file with tests has a `.spec.ts` at the same path in the test folder.
* Example (client):
  * `client/src/main/the/big/thing.ts` has its test file at `client/tests/main/the/big/thing.spec.ts`
    