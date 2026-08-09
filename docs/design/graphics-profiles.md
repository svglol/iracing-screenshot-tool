# Graphics config profiles

Status: **shipped.** Branch `feat/graphics-profiles`.

**The idea in one line:** iRacing keeps its graphics settings in a single file, so
storing copies of that file and putting one back is the whole feature — everything
below is about doing it without losing anyone's settings.

---

## 1. The problem

iRacing's graphics configuration lives in one file:

```
<Documents>\iRacing\rendererDX11Monitor.ini
```

People who both race and take screenshots want two different configurations —
triple-screen at playable settings for racing, single-screen at maximum quality
for stills — and iRacing offers no way to keep both. The established workaround is
to keep renamed copies beside the active file and swap them by hand in Explorer:

```
rendererDX11Monitor - Racing.ini
rendererDX11Monitor - Screenshots.ini
rendererDX11Monitor - Video.ini
```

This feature automates that swap.

---

## 2. The three facts that shaped the design

Measured against a real iRacing folder before any code was written.

### 2.1 iRacing rewrites the file when it exits

`rendererDX11Monitor.ini`, `app.ini`, `camera.ini` and `core.ini` all share a
modification time — the moment iRacing last closed. iRacing holds its graphics
settings in memory and writes them back on exit.

**Consequence:** a profile applied while iRacing is running is silently undone. The
user gets no error, and does not discover it until the next launch. `applyProfile`
therefore refuses outright while iRacing is up, and the UI disables Apply with the
reason shown. This is not a limitation that can be engineered away — only guarded.

### 2.2 Profiles differ wholesale

Racing vs Screenshots differed on **192 lines**, spanning `[Graphics Options]`,
`[Display]`, `[MonitorSetup]` and `[Replay Graphics]`.

**Consequence:** this is a byte-exact whole-file swap, never a key-level merge.

### 2.3 "Which profile is active" needs three answers, not two

The live config measured 5 settings away from the stored Screenshots profile, 11
from Video, 90 from Racing. It matched nothing exactly — because the user had
changed settings in-sim since applying it, and (see 2.1) iRacing wrote those
changes back.

**Consequence:** a two-state answer would report "no profile active" almost always,
which is useless. `resolveActiveProfile` returns:

| State | Meaning | Shown as |
|---|---|---|
| `clean` | hash matches a stored profile | "Matches your Screenshots profile." |
| `modified` | nothing matches, but we recorded what we last applied | "Based on Screenshots, with 5 settings changed since." |
| `unknown` | nothing matches and nothing was applied | "Does not match any stored profile." |

---

## 3. Layout

| Layer | File | Responsibility |
|---|---|---|
| Paths | `utilities/iracing-paths.ts` | Where the iRacing folder is |
| Rules | `utilities/iracing-profiles.ts` | Naming, validation, hashing, active-state resolution. Pure |
| I/O | `main/iracing-profiles-store.ts` | Listing, copying, backups, atomic writes |
| Bridge | `main/index.ts` (`profiles:*`) | Supplies context, persists `activeGraphicsProfile` |
| UI | `renderer/components/GraphicsProfilesModal.vue` | Toolbar modal |

Profiles are stored in `<userData>/graphics-profiles/`, one `.ini` per profile with
the filename as the display name. No manifest, so there is nothing to desync.

**Storage location was a deliberate choice.** Storing them in the iRacing folder
under the `rendererDX11Monitor - <name>.ini` convention would have auto-discovered
the files users already keep. Isolation in `userData` was chosen instead; the cost
is that existing files must be imported once, which Import handles, and Export
writes that same convention back out so profiles are never trapped.

### 3.1 Why `iracing-paths` does not import `config`

`utilities/config.ts` constructs an electron-store at module load, which throws
outside an Electron host — importing it would make every downstream module
untestable. The `iracingFolder` override is passed in by callers, who already hold
a config handle.

### 3.2 The Documents lookup

Resolved through `app.getPath('documents')`, not `homedir()/Documents`. The former
goes via `SHGetKnownFolderPath` and follows Known Folder redirection; a
OneDrive-backed Documents folder lives at `%USERPROFILE%\OneDrive\Documents`, which
the old hardcoded path missed entirely. That was a live bug in
`iracing-config-checks.ts` — OneDrive users silently got no config warnings — and
was fixed as its own commit.

---

## 4. Safety

Applying a profile overwrites the live configuration, which may be settings the
user tuned over an evening and never saved. Four properties protect that:

1. **Byte-exact copies.** All reads and writes go through Buffers. Never
   read-as-string-and-rewrite — that is how a line-ending or encoding change sneaks
   into a file another program parses. (See the `config.json` BOM incident.)
2. **Backup before every overwrite.** The outgoing file is copied into
   `.backups/` first, both when the live config is replaced and when a stored
   profile is. Ten kept, oldest pruned; names are ISO-stamped so lexical order is
   chronological.
3. **Atomic writes.** Staged in the destination directory — same volume, so the
   rename does not degrade to a copy — then renamed over the target. A crash
   mid-write leaves the original intact rather than a truncated ini, which would
   make iRacing re-run 3D auto-configuration and discard everything.
4. **Delete goes to the Recycle Bin** via `shell.trashItem`. A trash failure is
   reported, never escalated to a permanent delete.

### 4.1 Validation

A file must contain `[Graphics Options]` and `[Display]` to be stored or applied.
This is the guard against importing `app.ini` — a real file, same folder, same
extension — and writing it over the graphics config.

`AutoCfgCompleted=0` is a warning, not a refusal: iRacing re-runs its 3D
auto-configuration at startup when it sees that and overwrites the whole file, so
such a profile appears "not to stick".

### 4.2 What the comparison hash ignores

`canonicaliseIni` discards line endings, column padding, comment text, and section
and key order, then hashes. `[Debug]` is dropped entirely — iRacing fills it with
the detected driver DLL, version and vendor, which is machine state. Without that
exclusion a graphics-driver update would read as an edited profile.

---

## 5. Scope

Only `rendererDX11Monitor.ini`. Users often keep `app.ini` and `core.ini` variants
too; the store is built file-set-aware internally so adding them later is additive
rather than a rewrite. There is no automatic switching, and no auto-discovery of
the in-folder `rendererDX11Monitor - *.ini` variants.

---

## 6. Note for future work

`NameCheck` and `StoreResult` declare their optional members on **both** branches
(`error?: undefined`). This project compiles with `strictNullChecks: false`, under
which TypeScript will not narrow a union by a boolean discriminant — without those
members, `result.error` is inaccessible after `if (!result.ok)`. They are
load-bearing, not clutter.
