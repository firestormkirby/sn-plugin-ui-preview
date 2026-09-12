/**
 * device.tsx — boots your plugin's UI inside a browser-sized "device screen".
 *
 * Loaded in an iframe the harness sizes to the device's screen. That matters:
 * React Native UIs measure themselves against useWindowDimensions(), so
 * rendering into a div inside a normal page would silently use the browser
 * window's size and produce a panel the wrong shape for the device you are
 * documenting. The iframe IS the screen.
 */
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { View, Text, Pressable, Image } from 'react-native';

import { seed } from './mocks/async-storage';
import { seedFiles, seedHashes } from './mocks/react-native-fs';
import { onViewStateChange, CURRENT_PAGE, configureSdk } from './mocks/sn-plugin-lib';
import config from '../preview.config';

const params = new URLSearchParams(window.location.search);
const scenario =
  config.scenarios.find(s => s.id === params.get('scenario')) ?? config.scenarios[0];

async function boot(): Promise<void> {
  seed(scenario.storage ?? {});
  seedFiles({ ...(config.files ?? {}), ...(scenario.files ?? {}) });
  seedHashes(config.hashes ?? {});

  configureSdk({
    ...(config.sdk ?? {}),
    ...(scenario.sdk ?? {}),
    page: { ...(config.sdk?.page ?? {}), ...(scenario.sdk?.page ?? {}) },
    overrides: { ...(config.sdk?.overrides ?? {}), ...(scenario.sdk?.overrides ?? {}) },
  });

  /**
   * The page size must equal the window size, and this is why it is forced
   * here rather than left to the config.
   *
   * A plugin that maps taps to page coordinates typically fits the page inside
   * the screen preserving aspect ratio. A page whose shape disagrees with the
   * screen therefore gets letterboxed, and every tap in the resulting bars
   * clamps to the page edge — which presents as an invisible margin that
   * nothing can be positioned past. Inside the iframe one CSS pixel is one page
   * pixel, so these two must agree.
   */
  CURRENT_PAGE.pageSize = { width: window.innerWidth, height: window.innerHeight };

  await config.boot?.(scenario);
}

/** The page behind the panel — see Scenario.backdrop. */
function Backdrop() {
  if (!scenario.backdrop) return null;
  return (
    <Image
      source={{ uri: scenario.backdrop }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      resizeMode="cover"
    />
  );
}

/**
 * Stands in for the world the panel closes into.
 *
 * Closing is not an edge case for a Supernote plugin — work that cannot run
 * while the panel is open runs after it closes. A harness that unmounted on
 * close, or ignored it, would make those flows impossible to walk through.
 */
function ClosedScreen({ onReopen }: { onReopen: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', padding: 60 }}>
      <View style={{ backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', padding: 28, alignItems: 'center', maxWidth: 760 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000', marginBottom: 10 }}>
          Panel closed
        </Text>
        <Text style={{ fontSize: 15, color: '#333', textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>
          On the device you are looking at your page now, with the plugin
          working in the background.
        </Text>
        <Pressable
          onPress={onReopen}
          style={{ backgroundColor: '#000', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 6 }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>Reopen the panel</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Draws PluginManager.showToast and ToastAndroid.show. */
function Toast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    const fn = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      window.setTimeout(() => setMsg(null), 2600);
    };
    window.addEventListener('preview-toast', fn);
    return () => window.removeEventListener('preview-toast', fn);
  }, []);
  if (!msg) return null;
  return (
    <View style={{ position: 'absolute', bottom: 48, left: 0, right: 0, alignItems: 'center' }}>
      <View style={{ backgroundColor: '#000', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, maxWidth: '80%' }}>
        <Text style={{ color: '#fff', fontSize: 15 }}>{msg}</Text>
      </View>
    </View>
  );
}

function Device() {
  const [open, setOpen] = useState(true);
  // Remounts the panel, so reopening runs its mount effects as a fresh open
  // does on the device rather than resuming stale React state.
  const [generation, setGeneration] = useState(0);
  const { Panel } = config;

  useEffect(() => onViewStateChange(setOpen), []);

  return (
    // height, not flex: the parent is #root, a plain block element with no flex
    // context to grow into. flex:1 there collapses to content height, and a
    // panel that centres itself inside its container ends up at the top of the
    // screen instead.
    <View style={{ height: '100%', width: '100%', backgroundColor: '#ffffff' }}>
      <Backdrop />
      {open
        ? <Panel key={generation} />
        : <ClosedScreen onReopen={() => { setGeneration(g => g + 1); setOpen(true); }} />}
      <Toast />
    </View>
  );
}

/**
 * Cached on the container, because Vite's hot reload re-runs this module
 * against a DOM node that already has a root — which React reports as an error
 * that looks like a bug in the harness rather than what it is.
 */
const container = document.getElementById('root')! as HTMLElement & { _root?: ReturnType<typeof createRoot> };

void boot().then(() => {
  container._root ??= createRoot(container);
  container._root.render(<Device />);
});
