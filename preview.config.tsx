/**
 * The one file you edit.
 *
 * Point `Panel` at your plugin's root component, do your plugin's own startup
 * in `boot`, and describe the device states you want to look at as scenarios.
 * Nothing under src/ should need changing.
 *
 * As shipped this previews the bundled example so a fresh clone runs. Delete
 * the example/ folder once you have replaced it.
 */
import type { PreviewConfig } from './src/config';
import DemoPanel from './example/DemoPanel';

// For a real plugin this is the interesting line, and it imports straight from
// your source:
//
//   import HitboxPalette from '../../src/ui/HitboxPalette';
//
// with PLUGIN_ROOT in vite.config.ts pointing at the repo that contains it.

const config: PreviewConfig = {
  name: 'Demo plugin',
  Panel: DemoPanel,

  /**
   * Your plugin's startup, in the order index.js does it.
   *
   * Stores that load themselves from AsyncStorage go here:
   *
   *   boot: async () => {
   *     await Promise.all([
   *       initSettingsFromStorage(),
   *       initHitboxesFromStorage(),
   *     ]);
   *   },
   *
   * Running your real loaders, rather than pushing state in from the harness,
   * is what makes a scenario a picture of your plugin and not of the preview.
   */
  boot: undefined,

  /** Shared by every scenario; a scenario can add or override entries. */
  files: {
    '/storage/emulated/0/MyStyle/Example/templates/Daily.png': 'fake png bytes',
    '/storage/emulated/0/MyStyle/Example/templates/Weekly.png': 'fake png bytes',
  },

  /** Shared SDK answers; a scenario can override any of them. */
  sdk: {
    page: {
      filePath: '/storage/emulated/0/Note/Planner.note',
      pageNum: 2,
      totalPages: 37,
    },
  },

  scenarios: [
    {
      id: 'fresh',
      label: 'Fresh install',
      note: 'Nothing stored yet, first run state.',
      storage: {},
    },
    {
      id: 'configured',
      label: 'In use',
      note: 'Settings saved and a page labelled.',
      storage: {
        'demo:settings:v1': { compact: true, label: 'Monday' },
      },
    },
    {
      id: 'long-file',
      label: 'A long notebook',
      note: 'Same state, but the SDK reports a much larger file.',
      storage: {
        'demo:settings:v1': { compact: false, label: 'Monday' },
      },
      sdk: { page: { pageNum: 311, totalPages: 428 } },
    },
  ],
};

export default config;
