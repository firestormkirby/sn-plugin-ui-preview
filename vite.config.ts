import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Where your plugin's source lives, relative to this folder.
 *
 * Two layouts both work. Keep this harness inside your plugin repo (say
 * `tools/ui-preview/`) and point at `../../src`; or keep it as a sibling
 * checkout and point at `../my-plugin/src`. Vite is told it may read outside
 * its own root either way — see `server.fs.allow`.
 */
const PLUGIN_ROOT = path.resolve(here, process.env.PLUGIN_ROOT ?? '..');

export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: {
    /**
     * The four substitutions that let device code run in a browser. Everything
     * else — all of your plugin's own source — is imported unmodified, which is
     * the point: what you see here is the code that ships, not a copy of it
     * that will drift.
     *
     * The array form, with anchored patterns, because the object form matches
     * by PREFIX: a bare 'react-native' key would also capture 'react-native-fs'
     * and '@react-native-async-storage/...', and whichever entry Vite reached
     * first would win.
     */
    alias: [
      // Not straight to react-native-web: a thin file re-exports it and adds
      // the Android-only APIs it lacks. See src/mocks/react-native.ts.
      { find: /^react-native$/, replacement: path.resolve(here, 'src/mocks/react-native.ts') },
      { find: /^sn-plugin-lib$/, replacement: path.resolve(here, 'src/mocks/sn-plugin-lib.ts') },
      { find: /^react-native-fs$/, replacement: path.resolve(here, 'src/mocks/react-native-fs.ts') },
      {
        find: /^@react-native-async-storage\/async-storage$/,
        replacement: path.resolve(here, 'src/mocks/async-storage.ts'),
      },
    ],
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.json'],
  },
  define: {
    // react-native-web reads both; without them its modules throw on load.
    __DEV__: 'true',
    'process.env.NODE_ENV': JSON.stringify('development'),
    global: 'globalThis',
  },
  server: {
    port: 5178,
    /**
     * Listen on every interface, not loopback only, so the preview is reachable
     * from another machine — a tablet, a second desktop, a colleague on the
     * same network. `true` means 0.0.0.0: every network this machine is on. It
     * serves a dev page with fixture data and no write path to anything, but if
     * that is not a trade you want, put a specific address here instead.
     */
    host: true,
    /**
     * Vite refuses requests whose Host header it does not recognise (DNS
     * rebinding protection), answering "Blocked request" — which reads exactly
     * like the server not running. Add the names you reach it by: a LAN IP, a
     * Tailscale address, `.ts.net` for MagicDNS.
     */
    allowedHosts: ['localhost'],
    fs: {
      // Your plugin's source lives outside this root, so Vite has to be told
      // it may read it.
      allow: [here, PLUGIN_ROOT],
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(here, 'index.html'),
        device: path.resolve(here, 'device.html'),
      },
    },
  },
});
