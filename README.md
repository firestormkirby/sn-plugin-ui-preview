# sn-plugin-ui-preview

Run a Supernote plugin's React Native UI in a browser, so copy, layout and flow
can be worked on without building, pushing and installing a `.snplg` each time.

It is not a mock-up or a re-implementation. Your components and your storage
layer are imported from your repo and run unmodified; four modules that cannot
exist in a browser are substituted, and nothing else. **Change a label in your
source and it changes in the preview on save.**

```bash
npm install
npm run dev          # http://localhost:5178 — runs the bundled example
```

Then point `preview.config.tsx` at your own panel.

---

## Read this first: what it does not do

**It cannot catch the deadlock that defines this SDK.** `PluginComm` and
`PluginFile` calls made while the plugin view is open hang on a real device.
Here they resolve instantly. You can build an entire flow in this harness,
watch it work perfectly, and have it lock up the moment it runs on hardware.

That is the single most important limitation and it is not fixable from a
browser: the behaviour lives in the host process, not in the SDK's shape.

Two smaller ones worth knowing:

- **react-native-web is CSS flexbox, not Yoga.** Very close, not identical —
  notably `flexShrink` defaults differ. Layout that depends on flex edge cases
  can behave differently here than on device. Good for copy, spacing and gross
  layout; not authoritative for the awkward cases.
- **Nothing is written.** Calls that would insert pages, write elements or
  overwrite files report success having done nothing.

Use it for what it is: iterate on the interface here, verify behaviour on the
device.

---

## What gets substituted

| Module | Replaced with | Why |
|---|---|---|
| `react-native` | `react-native-web` + shims | The only way to render RN components in a browser. |
| `sn-plugin-lib` | a Proxy-backed mock | Native TurboModule. Unknown calls resolve to `{success: true}` and log themselves. |
| `react-native-fs` | a fake `/storage` tree | So file pickers and folder scans have real content. |
| `@react-native-async-storage/async-storage` | an in-memory map | Seeded per scenario; a reload is a clean device. |

Everything else — every file in your `src/` — is the real thing.

## Setting it up for your plugin

**1. Put it somewhere it can see your source.** Either clone it next to your
plugin, or drop it inside your repo as `tools/ui-preview/`. Set `PLUGIN_ROOT`
in `vite.config.ts` accordingly; it only controls which directory Vite is
allowed to read outside its own root.

**2. Edit `preview.config.tsx`.** Three things:

```tsx
import HitboxPalette from '../../src/ui/HitboxPalette';
import { initSettingsFromStorage } from '../../src/storage/settings';

const config: PreviewConfig = {
  name: 'My plugin',
  Panel: HitboxPalette,

  // Your plugin's own startup, in the order index.js does it.
  boot: async () => {
    await Promise.all([initSettingsFromStorage()]);
  },

  scenarios: [
    { id: 'fresh', label: 'Fresh install', storage: {} },
    {
      id: 'configured',
      label: 'In use',
      storage: { 'myplugin:settings:v1': { weekStart: 1 } },
    },
  ],
};
```

**3. That is the whole integration.** If a screen renders, you are done.

## Scenarios

A scenario is the AsyncStorage contents of a device in some state, loaded by
your real `init*FromStorage()` code. It contains no UI instructions, on purpose:
if a screen can only be reached by a back door, that is usually worth knowing
about the plugin rather than a reason to add one here.

A scenario can also carry `files` (extra entries in the fake filesystem), `sdk`
(different answers from the SDK — a bigger file, a lasso selection, a keyword
list) and `backdrop` (an image drawn behind the panel, for a plugin that sits on
top of a page).

## SDK answers

Anything the mock has not been told about resolves to `{success: true}` and logs
the call with its arguments — which doubles as a trace of what a screen actually
asks the SDK for. When a real return value drives what renders, add it:

```tsx
sdk: {
  overrides: {
    PluginFileAPI: {
      getKeyWords: () => Promise.resolve({
        success: true,
        result: [{ page: 3, keyWord: 'PLANNER:DAILY:2026-01-23' }],
      }),
    },
  },
}
```

## Why the device screen is an iframe

React Native UIs measure themselves against `useWindowDimensions()`. Rendering
into a `<div>` inside a normal page gives them the browser window's size, so the
panel comes out the wrong shape for the device you are documenting. The preview
is therefore a separate document sized to exactly the device's screen, which the
harness scales for viewing.

**One consequence is load-bearing: the page size must equal the window size.**
`Dimensions.get('screen') × PixelRatio.get()` multiplies out to the page's pixel
size on a device; in a browser those describe the developer's monitor. A plugin
that maps taps to page coordinates usually fits the page inside the screen
preserving aspect ratio, so a mismatched page size gets letterboxed — and every
tap in the resulting bars clamps to the page edge, which presents as an
invisible margin nothing can be positioned past. `src/mocks/react-native.ts`
overrides both APIs so one CSS pixel is one page pixel. Don't hardcode a page
size anywhere.

## Taking screenshots

**Open device view alone** serves the preview on its own at full device
resolution, no harness chrome — capture that. The zoom control is for looking;
anything below 100% is a scaled screenshot.

## Adding to the mocks

If your plugin imports something react-native-web lacks (an Android-only module,
a native module of your own), add it to `src/mocks/react-native.ts` next to
`ToastAndroid`, or give it its own file and an alias in `vite.config.ts`. Both
are a few lines. Pull requests welcome for anything generally useful.

## Licence

MIT.
