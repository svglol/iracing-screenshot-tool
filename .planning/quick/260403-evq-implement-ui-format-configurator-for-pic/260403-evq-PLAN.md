---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/utilities/config.js
  - src/utilities/filenameFormat.js
  - src/renderer/components/SettingsModal.vue
  - src/renderer/views/Worker.vue
autonomous: true
requirements: [FMT-01, FMT-02, FMT-03, FMT-04]

must_haves:
  truths:
    - "User can see available filename fields organized by category in Settings"
    - "User can click field chips to add them to the format pattern"
    - "User can type static text (separators like dashes, underscores) between fields"
    - "User sees a live preview of the resulting filename format"
    - "User's format pattern persists across app restarts"
    - "Screenshots are saved using the user-configured format instead of hardcoded pattern"
    - "Default format matches current behavior: {track}-{driver}-{counter}"
  artifacts:
    - path: "src/utilities/filenameFormat.js"
      provides: "Format field definitions and resolver function"
      exports: ["FILENAME_FIELDS", "resolveFilenameFormat", "DEFAULT_FORMAT"]
    - path: "src/utilities/config.js"
      provides: "filenameFormat persisted setting"
      contains: "filenameFormat"
    - path: "src/renderer/components/SettingsModal.vue"
      provides: "Format configurator UI section"
      contains: "Filename Format"
    - path: "src/renderer/views/Worker.vue"
      provides: "Updated getFileNameString using resolveFilenameFormat"
      contains: "resolveFilenameFormat"
  key_links:
    - from: "src/renderer/components/SettingsModal.vue"
      to: "src/utilities/config.js"
      via: "config.get('filenameFormat') / config.set('filenameFormat')"
      pattern: "config\\.(get|set)\\('filenameFormat'"
    - from: "src/renderer/components/SettingsModal.vue"
      to: "src/utilities/filenameFormat.js"
      via: "import FILENAME_FIELDS for chip display"
      pattern: "require.*filenameFormat"
    - from: "src/renderer/views/Worker.vue"
      to: "src/utilities/filenameFormat.js"
      via: "resolveFilenameFormat called in getFileNameString"
      pattern: "resolveFilenameFormat"
    - from: "src/renderer/views/Worker.vue"
      to: "src/utilities/config.js"
      via: "config.get('filenameFormat') to read user pattern"
      pattern: "config\\.get\\('filenameFormat'\\)"
---

<objective>
Implement a filename format configurator that lets users customize how screenshot files are named by selecting from available iRacing session fields and adding static separator text.

Purpose: Replace the hardcoded `trackName-driverName-count` filename pattern with a user-configurable format, giving users control over which session data appears in filenames and in what order.

Output: A new utility module for format resolution, a settings UI section with field chips and live preview, and updated Worker.vue using the configured format.
</objective>

<execution_context>
@.planning/quick/260403-evq-implement-ui-format-configurator-for-pic/260403-evq-PLAN.md
</execution_context>

<context>
@.planning/PROJECT.md
@src/utilities/config.js
@src/renderer/components/SettingsModal.vue
@src/renderer/views/Worker.vue

<interfaces>
<!-- Current config.js exports a single electron-store instance used as: -->
<!-- config.get('key'), config.set('key', value) -->
<!-- Schema is defined inline, each key has type + default -->

<!-- Worker.vue receives session data via IPC: -->
<!-- sessionInfo.data.WeekendInfo.TrackDisplayShortName -->
<!-- sessionInfo.data.DriverInfo.Drivers[].UserName, .TeamName, .AbbrevName, etc. -->
<!-- telemetry.values.CamCarIdx, .SessionNum, .Lap -->
<!-- sessionInfo.data.SessionInfo.Sessions[sessionNum].SessionType -->

<!-- SettingsModal.vue uses Buefy components: b-field, b-input, b-switch, b-button -->
<!-- Settings persist via config.get/config.set pattern with watchers -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create filename format utility and config schema</name>
  <files>src/utilities/filenameFormat.js, src/utilities/config.js</files>
  <action>
**1. Create `src/utilities/filenameFormat.js`** with these exports:

**FILENAME_FIELDS** - An array of field definition objects, each with `{ token, label, category, resolve(sessionInfo, telemetry) }`:

Track category:
- `{track}` -> `sessionInfo.data.WeekendInfo.TrackDisplayShortName` (label: "Track")
- `{trackFull}` -> `sessionInfo.data.WeekendInfo.TrackDisplayName` (label: "Track Full")
- `{trackCity}` -> `sessionInfo.data.WeekendInfo.TrackCity` (label: "City")
- `{trackCountry}` -> `sessionInfo.data.WeekendInfo.TrackCountry` (label: "Country")
- `{trackType}` -> `sessionInfo.data.WeekendInfo.TrackType` (label: "Track Type")

Driver category:
- `{driver}` -> If TeamRacing===1, use TeamName for DriverCarIdx driver; else use UserName for CamCarIdx driver (label: "Driver")
- `{driverAbbrev}` -> AbbrevName of CamCarIdx driver (label: "Driver Abbrev")
- `{driverInitials}` -> Initials of CamCarIdx driver (label: "Initials")
- `{team}` -> TeamName of CamCarIdx driver (label: "Team")
- `{carNumber}` -> CarNumber of CamCarIdx driver (label: "Car #")
- `{car}` -> CarScreenNameShort of CamCarIdx driver (label: "Car")
- `{carFull}` -> CarScreenName of CamCarIdx driver (label: "Car Full")
- `{carClass}` -> CarClassShortName of CamCarIdx driver (label: "Car Class")
- `{iRating}` -> IRating of CamCarIdx driver (label: "iRating")

Session category:
- `{sessionType}` -> SessionType from Sessions[telemetry.values.SessionNum] (label: "Session Type")
- `{sessionName}` -> SessionName from Sessions[telemetry.values.SessionNum] (label: "Session Name")
- `{lap}` -> telemetry.values.Lap (label: "Lap")

Meta category:
- `{date}` -> YYYY-MM-DD (label: "Date")
- `{time}` -> HH-MM-SS (label: "Time")
- `{datetime}` -> YYYY-MM-DD_HH-MM-SS (label: "Date+Time")
- `{counter}` -> placeholder, resolved separately in Worker (label: "Counter")

Create a helper function `findDriver(sessionInfo, telemetry)` that returns the DriverInfo.Drivers[] entry matching `telemetry.values.CamCarIdx` (used by most driver fields). Cache nothing -- called per screenshot.

**DEFAULT_FORMAT** - String constant: `'{track}-{driver}-{counter}'`

**resolveFilenameFormat(formatString, sessionInfo, telemetry)** - Function that:
1. Iterates over FILENAME_FIELDS
2. For each field whose `token` appears in formatString (using string replace, NOT regex -- tokens have literal braces), call `field.resolve(sessionInfo, telemetry)` and replace the token with the result
3. For `{counter}` token, do NOT resolve it here -- return the string with `{counter}` still in place. The Worker will handle counter resolution separately since it needs filesystem access.
4. Sanitize the result: replace characters invalid in Windows filenames (`\ / : * ? " < > |`) with underscore.
5. Return the resolved string (with `{counter}` placeholder still present if it was in the format).

**2. Update `src/utilities/config.js`** -- Add `filenameFormat` to the schema object:
```javascript
filenameFormat: {
  type: 'string',
  default: '{track}-{driver}-{counter}'
}
```

Place it after the `screenshotKeybind` entry to keep settings logically grouped.
  </action>
  <verify>
    <automated>node -e "const f = require('./src/utilities/filenameFormat.js'); console.log('FIELDS:', f.FILENAME_FIELDS.length); console.log('DEFAULT:', f.DEFAULT_FORMAT); console.log('Categories:', [...new Set(f.FILENAME_FIELDS.map(x=>x.category))].join(', ')); const config = require('./src/utilities/config.js'); console.log('Config default:', config.get('filenameFormat')); if (f.FILENAME_FIELDS.length >= 18 && f.DEFAULT_FORMAT === '{track}-{driver}-{counter}' && config.get('filenameFormat') === '{track}-{driver}-{counter}') { console.log('PASS'); } else { console.log('FAIL'); process.exit(1); }"</automated>
  </verify>
  <done>
    - filenameFormat.js exports FILENAME_FIELDS (18+ fields across 4 categories), DEFAULT_FORMAT, and resolveFilenameFormat
    - config.js schema includes filenameFormat with default matching current behavior
    - resolveFilenameFormat handles all tokens except {counter} (left as placeholder)
    - Filename-unsafe characters are sanitized to underscores
  </done>
</task>

<task type="auto">
  <name>Task 2: Add format configurator UI to SettingsModal</name>
  <files>src/renderer/components/SettingsModal.vue</files>
  <action>
Add a "Filename Format" section to SettingsModal.vue. Insert it after the Screenshot Keybind section (after line 75's closing `</b-field>`, before the `<hr>` that leads to Disable Tooltips).

**Data properties to add:**
- `filenameFormat: config.get('filenameFormat')` - the current format string
- `filenameFields: FILENAME_FIELDS` - imported from filenameFormat.js (add `const { FILENAME_FIELDS, DEFAULT_FORMAT } = require('../../utilities/filenameFormat');` at top of script)

**Watcher to add:**
```javascript
filenameFormat () {
  if (config.get('filenameFormat') !== this.filenameFormat) {
    config.set('filenameFormat', this.filenameFormat);
  }
}
```

**Computed property to add:**
- `filenamePreview` - Returns the filenameFormat string with tokens replaced by example values for display purposes. Use hardcoded example values (NOT live session data since Settings may be opened without an active session):
  - `{track}` -> "Daytona"
  - `{trackFull}` -> "Daytona International Speedway"
  - `{trackCity}` -> "Daytona Beach"
  - `{trackCountry}` -> "USA"
  - `{trackType}` -> "road course"
  - `{driver}` -> "Max Verstappen"
  - `{driverAbbrev}` -> "M. Verstappen"
  - `{driverInitials}` -> "MV"
  - `{team}` -> "Red Bull Racing"
  - `{carNumber}` -> "1"
  - `{car}` -> "MCL36"
  - `{carFull}` -> "McLaren MCL36"
  - `{carClass}` -> "GTP"
  - `{iRating}` -> "5231"
  - `{sessionType}` -> "Race"
  - `{sessionName}` -> "RACE"
  - `{lap}` -> "12"
  - `{date}` -> "2026-04-03"
  - `{time}` -> "14-30-00"
  - `{datetime}` -> "2026-04-03_14-30-00"
  - `{counter}` -> "0"
  Then append `.png` to the end of the preview.

- `fieldsByCategory` - Computed that groups FILENAME_FIELDS by category. Returns object like `{ Track: [...], Driver: [...], Session: [...], Meta: [...] }`. Use `FILENAME_FIELDS.reduce()` to group.

**Template to add (between keybind section and disable tooltips section):**

```html
<hr>
<b-field>
  <div>
    <span class="label" style="margin-bottom:0px;">Filename Format</span>
    <span class="description">Click fields to add them to the format. Type separators (-, _, etc.) directly.</span>
  </div>
</b-field>

<!-- Format input: editable text field showing the raw format string -->
<b-field>
  <b-input
    v-model="filenameFormat"
    type="text"
    placeholder="{track}-{driver}-{counter}"
    style="width:100%"
  />
  <p class="control">
    <b-button
      class="button is-light"
      style="width:80px"
      @click="filenameFormat = defaultFormat"
    >
      Reset
    </b-button>
  </p>
</b-field>

<!-- Preview -->
<b-field>
  <span class="description">Preview: <strong style="color:#fff">{{ filenamePreview }}</strong></span>
</b-field>

<!-- Available fields by category -->
<div v-for="(fields, category) in fieldsByCategory" :key="category" style="margin-bottom: 0.5rem;">
  <span class="description" style="display:block; margin-bottom:0.25rem;">{{ category }}</span>
  <div class="field is-grouped is-grouped-multiline">
    <div class="control" v-for="field in fields" :key="field.token">
      <b-tag
        type="is-primary"
        style="cursor:pointer"
        @click.native="insertField(field.token)"
      >
        {{ field.label }}
      </b-tag>
    </div>
  </div>
</div>
```

**Methods to add:**
- `insertField(token)` - Appends the token string to the end of `this.filenameFormat`. (Simple append is sufficient -- users can also directly edit the text input to reorder.)

**Also add to data:**
- `defaultFormat: DEFAULT_FORMAT`

Note on Buefy b-tag: The `@click.native` modifier is needed because b-tag does not emit a click event by default in Buefy/Vue 2. If `@click.native` does not work in this Buefy version, use a plain `<span class="tag is-primary">` with `@click` instead.
  </action>
  <verify>
    <automated>node -e "const fs = require('fs'); const content = fs.readFileSync('./src/renderer/components/SettingsModal.vue', 'utf8'); const checks = ['filenameFormat', 'filenamePreview', 'fieldsByCategory', 'insertField', 'Filename Format', 'FILENAME_FIELDS', 'defaultFormat', 'config.set']; const missing = checks.filter(c => !content.includes(c)); if (missing.length === 0) { console.log('PASS - all expected elements found'); } else { console.log('FAIL - missing:', missing.join(', ')); process.exit(1); }"</automated>
  </verify>
  <done>
    - Settings modal shows "Filename Format" section with editable text input
    - Available fields displayed as clickable tags organized by category (Track, Driver, Session, Meta)
    - Clicking a field tag appends its token to the format string
    - Live preview shows example filename with .png extension
    - Reset button restores default format
    - Format persists via config watcher (same pattern as other settings)
  </done>
</task>

<task type="auto">
  <name>Task 3: Wire Worker.vue to use configured filename format</name>
  <files>src/renderer/views/Worker.vue</files>
  <action>
Replace the `getFileNameString()` function in Worker.vue (lines 121-152) with a version that uses the new format resolver.

**Add import at top of script section (after existing requires around line 7):**
```javascript
const { resolveFilenameFormat } = require('../../utilities/filenameFormat');
```

**Replace `getFileNameString()` function entirely with:**

```javascript
function getFileNameString () {
  const formatString = config.get('filenameFormat') || '{track}-{driver}-{counter}';

  // Resolve all tokens except {counter}
  let resolved = resolveFilenameFormat(formatString, sessionInfo, telemetry);

  // Handle {counter} - find unique filename
  if (resolved.includes('{counter}')) {
    var unique = false;
    var count = 0;
    var screenshotFolder = config.get('screenshotFolder');
    var file = resolved.replace('{counter}', count);
    while (!unique) {
      if (fs.existsSync(screenshotFolder + file + '.png')) {
        count++;
        file = resolved.replace('{counter}', count);
      } else {
        unique = true;
      }
    }
    return file;
  } else {
    // No counter - still need uniqueness, append counter if file exists
    var screenshotFolder = config.get('screenshotFolder');
    if (fs.existsSync(screenshotFolder + resolved + '.png')) {
      var count = 1;
      while (fs.existsSync(screenshotFolder + resolved + '-' + count + '.png')) {
        count++;
      }
      return resolved + '-' + count;
    }
    return resolved;
  }
}
```

This preserves the existing counter/uniqueness behavior:
- If format contains `{counter}`, it works exactly like before (incrementing from 0).
- If format does NOT contain `{counter}`, it still avoids overwriting by appending `-1`, `-2`, etc. only when a collision is detected.

Do NOT change any other part of Worker.vue -- the `saveImage`, `fullscreenScreenshot`, and IPC handlers remain untouched. The function is called in the same places (line 36 for reshade, line 87 for normal).
  </action>
  <verify>
    <automated>node -e "const fs = require('fs'); const content = fs.readFileSync('./src/renderer/views/Worker.vue', 'utf8'); const checks = ['resolveFilenameFormat', 'filenameFormat', 'config.get', '{counter}']; const antiChecks = content.includes('TrackDisplayShortName') && content.includes('+ driverName + '); const missing = checks.filter(c => !content.includes(c)); if (missing.length === 0 && !antiChecks) { console.log('PASS - new format resolver wired, old hardcoded logic removed'); } else if (missing.length > 0) { console.log('FAIL - missing:', missing.join(', ')); process.exit(1); } else { console.log('FAIL - old hardcoded filename logic still present'); process.exit(1); }"</automated>
  </verify>
  <done>
    - Worker.vue imports and calls resolveFilenameFormat with session data
    - Old hardcoded trackName-driverName pattern is completely removed
    - Counter/uniqueness logic preserved for both {counter} and no-counter formats
    - Screenshots saved with user-configured filename format
    - Default config produces identical filenames to the old hardcoded behavior
  </done>
</task>

</tasks>

<verification>
1. Run the verify command for each task sequentially to confirm file contents
2. Check that config.js schema includes filenameFormat with correct default
3. Check that SettingsModal.vue has the full UI section with all expected elements
4. Check that Worker.vue no longer contains hardcoded track/driver concatenation
5. Ensure the default format `{track}-{driver}-{counter}` produces the same filenames as the original code
</verification>

<success_criteria>
- filenameFormat.js exists with 18+ field definitions across 4 categories and a working resolver function
- config.js persists filenameFormat with a sensible default matching current behavior
- SettingsModal shows field chips by category, an editable format input, a reset button, and a live preview
- Worker.vue uses resolveFilenameFormat instead of hardcoded logic
- Filenames with default format are identical to previous behavior (track-driver-counter)
- Format without {counter} still guarantees unique filenames via collision detection
</success_criteria>

<output>
After completion, create `.planning/quick/260403-evq-implement-ui-format-configurator-for-pic/260403-evq-SUMMARY.md`
</output>
